import { SocketIoSendError } from './socketio-send-error.js';
import type { AsyncClientEvents, AsyncClientSend } from './async-client.js';
import { dialSocketIo, type DialedSocket, type SocketIoDialOptions } from './socketio-dial.js';
import { WsClientError } from './ws-client-error.js';
import type { WsClientState } from './ws-client-state.js';
import type { WsMessage } from './ws-message.js';

/** How an ending nobody asked for arrives on the timeline: the way a hangup would. */
const HANGUP_CLOSE_CODE = 1006;

/**
 * The protocol names its endings; the timeline knows close codes. A close we asked for is the
 * normal one, and every other ending is a hangup.
 */
const CLOSE_CODE_OF_REASON: ReadonlyMap<string, number> = new Map([['io client disconnect', 1000]]);

export type SocketIoClientOptions = SocketIoDialOptions & {
    /** The namespace this client joins; absent is the root one the url points at. */
    namespace?: string | undefined;
};

/**
 * One Socket.IO socket behind the port every client promises. The protocol's own reconnection
 * and its auto-connect are switched off on purpose: Mandor owns the retry policy and the moment
 * of dialling, so two policies would not agree on what the state means.
 */
export class SocketIoClient {
    private socket: DialedSocket | undefined;
    private current: WsClientState = 'idle';

    constructor(
        private readonly url: string,
        private readonly events: AsyncClientEvents,
        private readonly options: SocketIoClientOptions = {},
    ) {}

    get state(): WsClientState {
        return this.current;
    }

    open(): void {
        if (this.current !== 'idle') {
            throw new WsClientError('open', this.current);
        }

        this.setState('connecting');

        const { namespace, ...dial } = this.options;
        const socket = dialSocketIo(uriWithNamespace(this.url, namespace), dial);

        this.socket = socket;

        socket.on('connect', () => {
            this.setState('open');
        });
        socket.on('disconnect', (reason: string) => {
            this.handleDisconnect(reason);
        });
        socket.on('connect_error', (error: Error) => {
            this.handleError(error);
        });
        // Every named event the server sends enters the same report; the reserved ones do not
        // pass through here — they have their own listeners above.
        socket.onAny((event: string, ...raw: unknown[]) => {
            const message = messageOf(raw);

            if (message !== undefined) {
                this.events.onMessage({ ...message, event });
            }
        });

        socket.connect();
    }

    send(data: string, send?: AsyncClientSend): void {
        if (this.current !== 'open' || this.socket === undefined) {
            throw new WsClientError('send', this.current);
        }

        // The protocol has no unnamed emission: an event with no name is a request nobody
        // asked for, refused here instead of sent as an empty one.
        if (send?.event === undefined || send.event === '') {
            throw new SocketIoSendError();
        }

        if (send.ack === undefined) {
            this.socket.emit(send.event, data);

            return;
        }

        const { id } = send.ack;

        this.socket.emit(send.event, data, (...reply: unknown[]) => {
            const message = messageOf(reply);

            if (message !== undefined) {
                this.events.onMessage({ ...message, event: send.event, replyTo: id });
            }
        });
    }

    close(): void {
        if (this.current !== 'open' && this.current !== 'connecting') {
            return;
        }

        const wasOpen = this.current === 'open';

        this.setState('closing');
        this.socket?.disconnect();

        // The protocol fires no ending for a socket that never joined, and whoever waits for one
        // would wait for ever: the attempt it just dropped ends here, the way an aborted
        // websocket attempt ends.
        if (!wasOpen) {
            this.setState('closed');
            this.events.onClose(HANGUP_CLOSE_CODE, '');
        }
    }

    dispose(): void {
        const socket = this.socket;

        this.socket = undefined;
        socket?.removeAllListeners();
        socket?.disconnect();
        this.current = 'closed';
    }

    private setState(state: WsClientState): void {
        this.current = state;
        this.events.onState(state);
    }

    private handleDisconnect(reason: string): void {
        this.setState('closed');
        this.events.onClose(CLOSE_CODE_OF_REASON.get(reason) ?? HANGUP_CLOSE_CODE, reason);
    }

    /**
     * Its own retries are off, so a failed handshake is the end of the attempt, and the protocol
     * fires nothing after it: without this ending, an open waits for ever and a retry that finds
     * the server down is the last one. It ends the way a websocket that could not open ends.
     */
    private handleError(error: Error): void {
        this.setState('error');
        this.events.onError(error);
        this.setState('closed');
        this.events.onClose(HANGUP_CLOSE_CODE, '');
    }
}

/**
 * The namespace rides the url: `https://host/chat` joins `/chat`, and a namespace that says
 * nothing means the root one. The engine path is not the namespace — it travels apart.
 */
function uriWithNamespace(url: string, namespace: string | undefined): string {
    if (namespace === undefined || namespace === '/' || url.endsWith(namespace)) {
        return url;
    }

    return `${url.replace(/\/+$/u, '')}${namespace}`;
}

/**
 * The payload the server named an event with, as the frame the timeline reports. A string
 * travels as it came, bytes as binary, and anything already parsed is serialized back to text.
 * A payload cannot arrive asking for an answer, and cannot be circular — it crossed the wire.
 */
function messageOf(raw: unknown[]): WsMessage | undefined {
    const payload = raw.at(0);

    if (payload === undefined || typeof payload === 'function') {
        return undefined;
    }

    if (typeof payload === 'string') {
        return { kind: 'text', data: payload };
    }

    if (payload instanceof Uint8Array) {
        return { kind: 'binary', data: new Uint8Array(payload) };
    }

    return { kind: 'text', data: JSON.stringify(payload) };
}
