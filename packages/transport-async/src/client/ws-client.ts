import { WebSocket, type RawData } from 'ws';

import { dialOptionsOf, type WsClientOptions } from './dial-options-of.js';
import { startKeepalive } from './keepalive-watchdog.js';
import { assertSocketUrl } from '../url/assert-socket-url.js';
import { WsClientError } from './ws-client-error.js';
import type { AsyncClientEvents } from './async-client.js';
import type { WsClientState } from './ws-client-state.js';

/**
 * One socket: open, send, close, and a report of everything that happens. The client
 * decides no policy — reconnection and backoff belong to the manager. `dispose` is the
 * teardown that never answers back: listeners go first, so nothing fires after it.
 */
export class WsClient {
    private socket: WebSocket | undefined;
    private current: WsClientState = 'idle';
    private stopKeepalive: (() => void) | undefined;

    constructor(
        private readonly url: string,
        private readonly events: AsyncClientEvents,
        private readonly options: WsClientOptions = {},
    ) {}

    get state(): WsClientState {
        return this.current;
    }

    open(): void {
        const url = assertSocketUrl('websocket', this.url);

        if (this.current !== 'idle') {
            throw new WsClientError('open', this.current);
        }

        this.setState('connecting');

        const socket = new WebSocket(
            url,
            this.options.subprotocols ?? [],
            dialOptionsOf(this.options),
        );

        // Pin the default explicitly: `asBuffer` relies on frames arriving as Buffer.
        socket.binaryType = 'nodebuffer';
        this.socket = socket;

        socket.on('open', () => {
            this.setState('open');
            this.startKeepalive(socket);
        });
        socket.on('message', (data: RawData, isBinary: boolean) => {
            this.handleMessage(data, isBinary);
        });
        socket.on('error', (error: Error) => {
            this.handleError(error);
        });
        socket.on('close', (code: number, reason: Buffer) => {
            this.handleClose(code, reason);
        });
    }

    send(data: string | Uint8Array): void {
        if (this.current !== 'open' || this.socket === undefined) {
            throw new WsClientError('send', this.current);
        }

        this.socket.send(data);
    }

    close(code = 1000, reason = ''): void {
        if (this.current !== 'open' && this.current !== 'connecting') {
            return;
        }

        const wasOpen = this.current === 'open';

        this.setState('closing');

        // A graceful close needs an established socket; an attempt still in flight is aborted.
        if (wasOpen) {
            this.socket?.close(code, reason);

            return;
        }

        this.socket?.terminate();
    }

    dispose(): void {
        this.stopBeating();
        this.socket?.removeAllListeners();

        const socket = this.socket;

        this.socket = undefined;

        if (socket !== undefined) {
            // Terminating an attempt in flight answers with an error event; without a
            // listener that error would crash the process during teardown.
            socket.on('error', () => undefined);

            if (
                this.current === 'connecting' ||
                this.current === 'open' ||
                this.current === 'closing'
            ) {
                socket.terminate();
            }
        }

        this.current = 'closed';
    }

    private setState(state: WsClientState): void {
        this.current = state;
        this.events.onState(state);
    }

    private startKeepalive(socket: WebSocket): void {
        if (this.options.keepalive === undefined) {
            return;
        }

        this.stopKeepalive = startKeepalive(socket, this.options.keepalive, () => {
            // A pong that overstayed its timeout is a dead line: the socket goes the
            // same way a server hangup does, and what watches it sees a close.
            this.socket?.terminate();
        });
    }

    private stopBeating(): void {
        this.stopKeepalive?.();
        this.stopKeepalive = undefined;
    }

    private handleMessage(data: RawData, isBinary: boolean): void {
        if (isBinary) {
            // Copy out of the Buffer: callers get plain bytes, not a view with a Node prototype.
            this.events.onMessage({ kind: 'binary', data: new Uint8Array(asBuffer(data)) });

            return;
        }

        this.events.onMessage({ kind: 'text', data: asBuffer(data).toString('utf8') });
    }

    private handleError(error: Error): void {
        this.setState('error');
        this.events.onError(error);
    }

    private handleClose(code: number, reason: Buffer): void {
        this.stopBeating();
        this.setState('closed');
        this.events.onClose(code, reason.toString());
    }
}

/** binaryType is pinned to nodebuffer, so ws always delivers a Buffer here. */
function asBuffer(data: RawData): Buffer {
    return data as Buffer;
}
