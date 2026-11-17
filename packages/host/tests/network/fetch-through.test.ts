import { once } from 'node:events';
import { createServer, request as forward, type Server } from 'node:http';
import { connect, type AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { fetchThrough } from '../../src/network/fetch-through.js';
import type { DialNetwork } from '../../src/network/network-for.js';

const servers: Server[] = [];

afterEach(async () => {
    await Promise.all(
        servers.splice(0).map(async (server) => {
            server.closeAllConnections();
            server.close();
            await once(server, 'close');
        }),
    );
});

async function listening(server: Server): Promise<string> {
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    return `127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

/** A token endpoint that answers what it was asked, with the status the path names. */
async function endpoint(): Promise<string> {
    const server = createServer((request, response) => {
        let body = '';

        request.setEncoding('utf8');
        request.on('data', (chunk: string) => {
            body += chunk;
        });
        request.on('end', () => {
            const status = Number(request.url?.slice(1)) || 200;

            response.writeHead(status, { 'content-type': 'application/json', 'x-seen': 'yes' });
            response.end(
                status === 204 ? undefined : JSON.stringify({ method: request.method, body }),
            );
        });
    });

    return `http://${await listening(server)}`;
}

/** An HTTP proxy that writes down every target it was asked for, tunnelled or forwarded. */
async function proxy(asked: string[]): Promise<string> {
    const server = createServer((request, response) => {
        asked.push(new URL(request.url ?? '').host);
        request.pipe(
            forward(
                request.url ?? '',
                { method: request.method, headers: request.headers },
                (answer) => {
                    response.writeHead(answer.statusCode ?? 502, answer.headers);
                    answer.pipe(response);
                },
            ),
        );
    });

    server.on('connect', (request, client, head) => {
        const target = request.url ?? '';
        const [host = '', port = ''] = target.split(':');
        const upstream = connect(Number(port), host, () => {
            asked.push(target);
            client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            upstream.write(head);
            upstream.pipe(client);
            client.pipe(upstream);
        });
    });

    return `http://${await listening(server)}`;
}

/** An endpoint that never stops answering: chunk after chunk until the client hangs up. */
async function endless(): Promise<string> {
    const server = createServer((_request, response) => {
        const chunk = Buffer.alloc(64 * 1024, 'x');

        response.writeHead(200, { 'content-type': 'application/json' });
        response.on('drain', () => response.write(chunk));
        response.write(chunk);
    });

    return `http://${await listening(server)}`;
}

function through(network: DialNetwork): ReturnType<typeof fetchThrough> {
    return fetchThrough(() => Promise.resolve(network));
}

const POST = {
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST' as const,
    redirect: 'manual' as const,
};

describe('a fetch that goes out by the network of this machine', () => {
    it('hands back what the endpoint answered: status, headers and body', async () => {
        const url = await endpoint();
        const answer = await through({ tls: {} })(`${url}/201`, POST);

        expect(answer.status).toBe(201);
        expect(answer.headers.get('x-seen')).toBe('yes');
        expect(await answer.json()).toEqual({
            method: 'POST',
            body: 'grant_type=client_credentials',
        });
    });

    it('reaches the endpoint through the proxy the network names', async () => {
        const asked: string[] = [];
        const url = await endpoint();
        const answer = await through({ proxy: { url: await proxy(asked) }, tls: {} })(
            `${url}/200`,
            POST,
        );

        expect(answer.status).toBe(200);
        expect(asked).toEqual([new URL(url).host]);
    });

    it('hands back an answer that carries no body', async () => {
        const url = await endpoint();
        const answer = await through({ tls: {} })(`${url}/204`, POST);

        expect(answer.status).toBe(204);
        expect(answer.body).toBeNull();
    });

    it('stops reading an answer that outgrows any token, instead of filling memory', async () => {
        const url = await endless();

        await expect(through({ tls: {} })(url, POST)).rejects.toThrow(
            'the answer is larger than 1048576 bytes',
        );
    });

    it('refuses a proxy it cannot speak instead of going straight', async () => {
        const url = await endpoint();

        await expect(
            through({ proxy: { url: 'ftp://127.0.0.1:1' }, tls: {} })(`${url}/200`, POST),
        ).rejects.toThrow('the proxy ftp: is not supported');
    });
});
