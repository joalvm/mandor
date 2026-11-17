import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import type { Duplex } from 'node:stream';

import { expect, test, vi } from 'vitest';

import { WsClient } from '../../src/client/ws-client.js';
import type { WsClientState } from '../../src/client/ws-client-state.js';

/**
 * A server that completes the websocket handshake and then goes mute: the upgrade is answered,
 * every ping is swallowed, and no pong ever comes back — the line a keepalive has to take for
 * dropped.
 */
async function startMuteServer(): Promise<{ url: string; close: () => Promise<void> }> {
    const server = createServer();
    const lines = new Set<Duplex>();

    server.on('upgrade', (request, socket) => {
        const key = request.headers['sec-websocket-key'] ?? '';
        const accept = createHash('sha1')
            .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
            .digest('base64');

        lines.add(socket);
        socket.write(
            `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
        );
        socket.on('data', () => undefined);
        socket.on('close', () => {
            lines.delete(socket);
        });
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();

    if (address === null || typeof address === 'string') {
        throw new Error('mute server is not listening on a TCP port');
    }

    return {
        url: `ws://127.0.0.1:${String(address.port)}`,
        close: async () => {
            for (const line of lines) {
                line.destroy();
            }

            await new Promise<void>((resolve) => {
                server.close(() => {
                    resolve();
                });
            });
        },
    };
}

test('takes a mute line for dropped, and the socket reports the close', async () => {
    const mute = await startMuteServer();
    const states: WsClientState[] = [];
    const client = new WsClient(
        mute.url,
        {
            onState: (state) => {
                states.push(state);
            },
            onMessage: () => undefined,
            onClose: () => undefined,
            onError: () => undefined,
        },
        { keepalive: { intervalMs: 50, pongTimeoutMs: 100 } },
    );

    client.open();

    await vi.waitFor(
        () => {
            expect(states.at(-1)).toBe('closed');
        },
        { timeout: 5_000 },
    );

    expect(states).toEqual(['connecting', 'open', 'closed']);
    client.dispose();
    await mute.close();
});
