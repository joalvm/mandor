import { expect, vi } from 'vitest';

import { SocketIoClient, type SocketIoClientOptions } from '../../src/client/socketio-client.js';
import type { WsClientState } from '../../src/client/ws-client-state.js';
import type { WsMessage } from '../../src/client/ws-message.js';
import type { AsyncClientEvents } from '../../src/client/async-client.js';

/** Everything one Socket.IO client reported, in the order it came. */
export type SocketIoClientSeen = {
    states: WsClientState[];
    messages: WsMessage[];
    closed: { code: number; reason: string }[];
    errors: Error[];
};

/**
 * A client whose every report is kept in `seen`. An event the test answers itself stops being
 * kept, so a test that waits on one callback still sees the rest.
 */
export function watchSocketIoClient(
    url: string,
    options: SocketIoClientOptions = {},
    events: Partial<AsyncClientEvents> = {},
): { client: SocketIoClient; seen: SocketIoClientSeen } {
    const seen: SocketIoClientSeen = { states: [], messages: [], closed: [], errors: [] };
    const client = new SocketIoClient(
        url,
        {
            onState: (state) => {
                seen.states.push(state);
            },
            onMessage: (message) => {
                seen.messages.push(message);
            },
            onClose: (code, reason) => {
                seen.closed.push({ code, reason });
            },
            onError: (error) => {
                seen.errors.push(error);
            },
            ...events,
        },
        options,
    );

    return { client, seen };
}

/** Opens a watched client and waits until its handshake is through. */
export async function openedSocketIoClient<Watched extends { client: SocketIoClient }>(
    watched: Watched,
): Promise<Watched> {
    watched.client.open();

    await vi.waitFor(() => {
        expect(watched.client.state).toBe('open');
    });

    return watched;
}
