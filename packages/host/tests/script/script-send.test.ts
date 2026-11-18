import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { newScriptSender, type ScriptSender } from '../../src/script/script-send.js';
import { failedReply } from '../../src/script/send-reply.js';

type Hit = { method: string; url: string; headers: IncomingMessage['headers']; body: string };
type Handler = (request: IncomingMessage, response: ServerResponse, hit: Hit) => void;

const servers: Server[] = [];
const NEVER = new AbortController().signal;

// A real server on the loopback: what the sender does shows in what the server receives.
async function serve(handler: Handler): Promise<{ origin: string; hits: Hit[] }> {
    const hits: Hit[] = [];
    const server = createServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            const hit = {
                method: request.method ?? '',
                url: request.url ?? '',
                headers: request.headers,
                body: Buffer.concat(chunks).toString(),
            };

            hits.push(hit);
            handler(request, response, hit);
        });
    });

    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return { origin: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`, hits };
}

function senderOf(
    hide: (text: string) => string = (text) => text,
    timeoutMs?: number,
): ScriptSender {
    return newScriptSender({
        networkFor: () => Promise.resolve({ tls: {} }),
        hide,
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
    });
}

function payload(url: string, rest: object = {}): string {
    return JSON.stringify({ url, method: 'GET', headers: [], ...rest });
}

function parsed(reply: string): Record<string, unknown> {
    return JSON.parse(reply) as Record<string, unknown>;
}

afterEach(async () => {
    await Promise.all(
        servers.splice(0).map(
            (server) =>
                new Promise<void>((resolve) => {
                    server.closeAllConnections();
                    server.close(() => {
                        resolve();
                    });
                }),
        ),
    );
});

describe('a request of a script', () => {
    it('goes out as written, and the answer comes back with its status, headers, body and time', async () => {
        const { origin, hits } = await serve((_request, response) => {
            response.writeHead(201, { 'content-type': 'text/plain', 'x-answer': 'yes' });
            response.end('hello');
        });
        const reply = parsed(
            await senderOf()(
                payload(`${origin}/path?q=1`, {
                    method: 'POST',
                    headers: [{ name: 'X-Sent', value: 'a' }],
                    body: 'payload',
                }),
                NEVER,
            ),
        );

        expect(hits).toHaveLength(1);
        expect(hits[0]).toMatchObject({ method: 'POST', url: '/path?q=1', body: 'payload' });
        expect(hits[0]?.headers['x-sent']).toBe('a');
        expect(reply).toMatchObject({ ok: true, status: 201, text: 'hello' });
        expect(reply['headers']).toEqual(
            expect.arrayContaining([{ name: 'x-answer', value: 'yes' }]),
        );
        expect(typeof reply['timeMs']).toBe('number');
    });

    it('is hidden for each answer, in the body and in every value of a header', async () => {
        const seen: string[] = [];
        const hide = (text: string): string => {
            seen.push(text);

            return text.replaceAll('SECRET', '***');
        };

        const { origin } = await serve((_request, response) => {
            response.writeHead(200, { 'x-token': 'a SECRET b' });
            response.end('the SECRET body');
        });
        const send = senderOf(hide);
        const first = parsed(await send(payload(origin), NEVER));

        await send(payload(origin), NEVER);

        expect(first['text']).toBe('the *** body');
        expect(first['headers']).toEqual(
            expect.arrayContaining([{ name: 'x-token', value: 'a *** b' }]),
        );
        expect(seen.filter((text) => text === 'the SECRET body')).toHaveLength(2);
    });

    it('comes back as the 302 it is, and nothing is asked of the address it points to', async () => {
        const target = await serve((_request, response) => {
            response.end('elsewhere');
        });
        const { origin } = await serve((_request, response) => {
            response.writeHead(302, { location: `${target.origin}/moved` });
            response.end();
        });
        const reply = parsed(await senderOf()(payload(origin), NEVER));

        expect(reply).toMatchObject({ ok: true, status: 302 });
        expect(reply['headers']).toEqual(
            expect.arrayContaining([{ name: 'location', value: `${target.origin}/moved` }]),
        );
        expect(target.hits).toEqual([]);
    });

    it.each([
        ['file:///etc/passwd', 'A script can send to http and https only, not to file:'],
        ['ftp://127.0.0.1/a', 'A script can send to http and https only, not to ftp:'],
        ['data:text/plain,hi', 'A script can send to http and https only, not to data:'],
        ['not a url', 'The url of the request is not valid'],
    ])('is refused for %s, and never goes out', async (url, message) => {
        expect(await senderOf()(payload(url), NEVER)).toBe(failedReply(message));
    });

    it.each([['not json'], ['{}'], ['{"url":"http://a.test","method":"","headers":[]}']])(
        'is refused when the payload is %s',
        async (text) => {
            expect(await senderOf()(text, NEVER)).toBe(failedReply('The request is not valid'));
        },
    );

    it('is refused when its body has more bytes than the limit, though fewer characters', async () => {
        const { origin, hits } = await serve((_request, response) => {
            response.end('x');
        });
        const body = '€'.repeat(Math.ceil((1024 * 1024) / 3) + 1);
        const reply = parsed(await senderOf()(payload(origin, { method: 'POST', body }), NEVER));

        expect(reply).toEqual({
            ok: false,
            message: 'The body of the request is bigger than 1048576 bytes',
        });
        expect(hits).toEqual([]);
    });

    it('fails with the reason when the answer is bigger than the limit', async () => {
        const { origin } = await serve((_request, response) => {
            response.end(Buffer.alloc(1024 * 1024 + 1));
        });
        const reply = parsed(await senderOf()(payload(origin), NEVER));

        expect(reply).toMatchObject({ ok: false });
        expect(String(reply['message'])).toContain('larger than 1048576 bytes');
    });

    it('fails with the code of the network when nobody answers at the address', async () => {
        const { origin } = await serve((_request, response) => {
            response.end();
        });

        await Promise.all(servers.splice(0).map((server) => new Promise((r) => server.close(r))));

        expect(parsed(await senderOf()(payload(origin), NEVER))).toEqual({
            ok: false,
            message: 'The request failed: ECONNREFUSED',
        });
    });

    it('fails with the reason when the method cannot carry a body', async () => {
        const { origin } = await serve((_request, response) => {
            response.end();
        });
        const reply = parsed(await senderOf()(payload(origin, { body: 'x' }), NEVER));

        expect(reply).toMatchObject({ ok: false });
    });

    it('fails at its time when the server does not answer', async () => {
        const { origin } = await serve(() => undefined);

        expect(parsed(await senderOf((text) => text, 100)(payload(origin), NEVER))).toEqual({
            ok: false,
            message: 'The request took longer than 100 ms',
        });
    });

    it('ends in flight when the chain of the run is aborted', async () => {
        const { origin, hits } = await serve(() => undefined);
        const chain = new AbortController();
        const sending = senderOf()(payload(origin), chain.signal);

        await expect.poll(() => hits.length).toBe(1);
        chain.abort();

        expect(parsed(await sending)).toMatchObject({ ok: false });
    });
});
