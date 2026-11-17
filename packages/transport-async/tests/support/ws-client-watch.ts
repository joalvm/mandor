import { WsClient } from '../../src/client/ws-client.js';
import type { WsClientOptions } from '../../src/client/dial-options-of.js';
import type { WsClientState } from '../../src/client/ws-client-state.js';
import type { WsMessage } from '../../src/client/ws-message.js';

export type WsClientWatch = {
    client: WsClient;
    states: WsClientState[];
    messages: WsMessage[];
    errors: Error[];
    opened: Promise<void>;
    closed: Promise<{ code: number; reason: string }>;
};

/** Wires the callbacks so the test awaits events instead of polling the clock. */
export function watchWsClient(url: string, options: WsClientOptions = {}): WsClientWatch {
    const states: WsClientState[] = [];
    const messages: WsMessage[] = [];
    const errors: Error[] = [];
    let open!: () => void;
    let close!: (code: number, reason: string) => void;
    const opened = new Promise<void>((resolve) => {
        open = resolve;
    });
    const closed = new Promise<{ code: number; reason: string }>((resolve) => {
        close = (code, reason) => {
            resolve({ code, reason });
        };
    });

    const client = new WsClient(
        url,
        {
            onState: (state) => {
                states.push(state);

                if (state === 'open') {
                    open();
                }
            },
            onMessage: (message) => {
                messages.push(message);
            },
            onClose: (code, reason) => {
                close(code, reason);
            },
            onError: (error) => {
                errors.push(error);
            },
        },
        options,
    );

    return { client, states, messages, errors, opened, closed };
}
