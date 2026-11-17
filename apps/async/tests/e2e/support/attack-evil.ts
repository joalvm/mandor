import {
    createServer,
    type IncomingHttpHeaders,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

/** What reached the other origin: the line, the headers and the body, as text. */
type AttackHit = {
    method: string;
    url: string;
    headers: IncomingHttpHeaders;
    body: string;
};

export type AttackEvil = {
    /** `http://127.0.0.1:<port>`: the other origin, which only listens for what a script sends. */
    url: string;
    /** Every request that reached it, in order. */
    hits: AttackHit[];
    /** Whether a hit carries any known form of the secret, in its line, a header or its body. */
    carriesSecret: (hit: AttackHit) => boolean;
    /** Whether the whole handshake the server was handed carries any known form of the secret. */
    carriesSecretIn: (parts: { query?: unknown; headers: Record<string, unknown> }) => boolean;
    close: () => Promise<void>;
};

/** Every form of the secret worth looking for: as it is, in base64, in a URL and inside JSON. */
function spellings(secret: string): string[] {
    return [
        secret,
        Buffer.from(secret).toString('base64'),
        Buffer.from(secret).toString('base64url'),
        encodeURIComponent(secret),
        JSON.stringify(secret).slice(1, -1),
    ];
}

/**
 * The listener of the other side: everything a script of the hostile repo manages to send lands
 * here, written down, so a spec can say the secret never did. Loopback only, a port of its own,
 * no network beyond this machine.
 */
export async function startAttackEvil(secret: string): Promise<AttackEvil> {
    const forms = spellings(secret);
    const hits: AttackHit[] = [];
    const hasForm = (text: string): boolean => forms.some((form) => text.includes(form));
    const server: Server = createServer((request: IncomingMessage, response: ServerResponse) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });
        request.on('end', () => {
            hits.push({
                body: Buffer.concat(chunks).toString('utf8'),
                headers: request.headers,
                method: request.method ?? '',
                url: request.url ?? '',
            });
            response.setHeader('Content-Type', 'text/plain');
            response.end('stolen');
        });
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    return {
        url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        carriesSecret: (hit) =>
            hasForm([hit.url, JSON.stringify(hit.headers), hit.body].join('\n')),
        carriesSecretIn: ({ headers, query }) =>
            hasForm(`${JSON.stringify(headers)}\n${JSON.stringify(query ?? null)}`),
        close: () => {
            server.closeAllConnections();

            return new Promise((resolve) => {
                server.close(() => {
                    resolve();
                });
            });
        },
        hits,
    };
}
