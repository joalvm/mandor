import { describe, expect, it } from 'vitest';

import { SocketIoClient } from '../../src/client/socketio-client.js';
import type { WsClientState } from '../../src/client/ws-client-state.js';
import { WsClient } from '../../src/client/ws-client.js';
import { clientOf } from '../../src/manager/client-of.js';
import { startSocketIoServer } from '../support/socketio-server.js';
import { waitFor } from '../support/wait-for.js';

const EVENTS = {
    onState: () => undefined,
    onMessage: () => undefined,
    onClose: () => undefined,
    onError: () => undefined,
};

describe('the client a connection dials with', () => {
    it.each([
        ['websocket', 'ws://localhost:1', WsClient],
        ['socketio', 'http://localhost:1', SocketIoClient],
    ] as const)('gives a %s connection the client of its transport', (transport, url, kind) => {
        const client = clientOf({ connectionId: 'c', transport, url }, EVENTS);

        expect(client).toBeInstanceOf(kind);
        client.dispose();
    });

    /** The ceiling of the open request reaches Socket.IO the way it reaches a bare websocket. */
    it('gives a socketio connection the maximum message size of its request', async () => {
        const server = await startSocketIoServer();
        const states: WsClientState[] = [];
        const client = clientOf(
            {
                connectionId: 'c',
                transport: 'socketio',
                url: server.url,
                engineTransport: 'websocket-only',
                maximumMessageSizeBytes: 512,
            },
            {
                ...EVENTS,
                onState: (state) => {
                    states.push(state);
                },
            },
        );

        client.open();
        await waitFor(() => {
            expect(states.at(-1)).toBe('open');
        });
        server.broadcast('big', 'x'.repeat(4096));

        await waitFor(() => {
            expect(states.at(-1)).toBe('closed');
        });
        client.dispose();
        await server.close();
    });
});
