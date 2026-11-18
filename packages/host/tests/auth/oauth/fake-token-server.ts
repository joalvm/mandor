import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export type TokenRequest = {
    path: string;
    headers: IncomingHttpHeaders;
    body: URLSearchParams;
};

export type TokenReply = { status?: number; body: unknown };

export type FakeTokenServer = {
    /** `http://127.0.0.1:<port>`: a loopback origin, the only plain http the host accepts. */
    origin: string;
    requests: TokenRequest[];
    close: () => Promise<void>;
};

/** An authorization server that answers every request the same way the test says. */
export async function startTokenServer(
    reply: (request: TokenRequest) => TokenReply,
): Promise<FakeTokenServer> {
    const requests: TokenRequest[] = [];
    const server = createServer((incoming, outgoing) => {
        const chunks: Buffer[] = [];

        incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
        incoming.on('end', () => {
            const request: TokenRequest = {
                path: incoming.url ?? '',
                headers: incoming.headers,
                body: new URLSearchParams(Buffer.concat(chunks).toString('utf8')),
            };
            const answer = reply(request);

            requests.push(request);
            outgoing.writeHead(answer.status ?? 200, { 'content-type': 'application/json' });
            outgoing.end(JSON.stringify(answer.body));
        });
    });

    await listen(server);

    const { port } = server.address() as AddressInfo;

    return {
        origin: `http://127.0.0.1:${String(port)}`,
        requests,
        close: () =>
            new Promise((resolve) => {
                server.close(() => {
                    resolve();
                });
            }),
    };
}

function listen(server: Server): Promise<void> {
    return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}
