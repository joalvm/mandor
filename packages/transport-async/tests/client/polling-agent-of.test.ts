import { Agent, createServer, get, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { MAX_POLL_RESPONSE_BYTES, pollingAgentOf } from '../../src/client/polling-agent-of.js';
import { startEndlessServer, type Closable } from '../support/network-servers.js';

const opened: Closable[] = [];

afterEach(async () => {
    await Promise.all(opened.splice(0).map((server) => server.close()));
});

/** What one GET through the agent ended with: the bytes it got, and the error, if any. */
function fetched(url: string, agent: Agent): Promise<{ received: number; error?: Error }> {
    let received = 0;

    return new Promise((resolve) => {
        // The cut answer fails its request too, as the library underneath hears it.
        get(url, { agent }, (response: IncomingMessage) => {
            response.on('data', (chunk: Buffer) => {
                received += chunk.length;
            });
            response.on('end', () => {
                resolve({ received });
            });
            response.on('error', (error) => {
                resolve({ received, error });
            });
        }).on('error', (error) => {
            resolve({ received, error });
        });
    });
}

/** A server that answers every request with the same short text. */
async function startShortServer(text: string): Promise<Closable & { url: string }> {
    const server = createServer((_request, response) => {
        response.end(text);
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const { port } = server.address() as AddressInfo;

    return {
        url: `http://127.0.0.1:${String(port)}`,
        close: () =>
            new Promise((resolve) => {
                server.close(() => {
                    resolve();
                });
            }),
    };
}

describe('the agent every poll of Socket.IO goes out by (polling-agent-of)', () => {
    /** The library underneath keeps the whole answer of a poll, and copies it on every piece. */
    it('lets go of an answer once it passes the most a poll may carry', async () => {
        const server = await startEndlessServer();

        opened.push(server);

        const { received, error } = await fetched(server.url, pollingAgentOf(false, undefined));

        expect(error?.message).toMatch(/poll/u);
        expect(received).toBeGreaterThan(MAX_POLL_RESPONSE_BYTES - 1024 * 1024);
        expect(received).toBeLessThanOrEqual(MAX_POLL_RESPONSE_BYTES + 1024 * 1024);
    });

    it('hands an answer within the limit through whole', async () => {
        const server = await startShortServer('0{"sid":"a"}');

        opened.push(server);

        const result = await fetched(server.url, pollingAgentOf(false, undefined));

        expect(result).toEqual({ received: 12 });
    });

    /** With no proxy, each scheme goes out by an agent of its own, as with none given. */
    it.each([
        [false, 'http:'],
        [true, 'https:'],
    ] as const)('goes out, secure %s, by an agent of %s', (secure, protocol) => {
        expect(Reflect.get(pollingAgentOf(secure, undefined), 'protocol')).toBe(protocol);
    });

    /** A proxy is an agent: the poll still goes out through it. */
    it('goes out through the agent it is given', async () => {
        const server = await startShortServer('ok');
        const dialled: string[] = [];

        opened.push(server);

        class Counted extends Agent {
            override createConnection(
                ...args: Parameters<Agent['createConnection']>
            ): ReturnType<Agent['createConnection']> {
                dialled.push(String((args[0] as { port?: unknown }).port));

                return super.createConnection(...args);
            }
        }

        await fetched(server.url, pollingAgentOf(false, new Counted()));

        expect(dialled).toEqual([new URL(server.url).port]);
    });
});
