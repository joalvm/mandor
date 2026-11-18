import {
    createServer,
    type IncomingHttpHeaders,
    type IncomingMessage,
    type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';

/** What reached a server of the attack: the line, the headers and the body, as text. */
export type AttackHit = {
    method: string;
    url: string;
    headers: IncomingHttpHeaders;
    body: string;
};

export type AttackServer = {
    /** `http://127.0.0.1:<port>`: the origin the requests of the hostile repo are written against. */
    api: string;
    /** `http://127.0.0.1:<port>`: the other origin, which only listens for what a script steals. */
    evil: string;
    /** Every request that reached the echo of `api`, in order. */
    echoes: AttackHit[];
    /** Every request that reached the open redirect of `api`, in order. */
    opens: AttackHit[];
    /** Every request that reached `evil`, in order. */
    evilHits: AttackHit[];
    /** Whether a hit carries any known form of the secret, in its line, a header or its body. */
    carriesSecret: (hit: AttackHit) => boolean;
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

function hitOf(request: IncomingMessage, body: string): AttackHit {
    return { method: request.method ?? '', url: request.url ?? '', headers: request.headers, body };
}

/** Reads the whole body of a request before answering, the way the echo needs it read. */
function readBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];

    request.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
    });

    return new Promise((resolve) => {
        request.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
    });
}

/**
 * The two origins of an attack on the send: an `api` that answers an echo and an open redirect
 * (`/open?to=…&status=…`, the 307 a script leans on), and an `evil` that writes down everything
 * it is handed. Both live on this machine, on ports of their own, and both keep what reached
 * them so a spec can say the secret never did.
 */
export async function startAttackServer(secret: string): Promise<AttackServer> {
    const forms = spellings(secret);
    const echoes: AttackHit[] = [];
    const opens: AttackHit[] = [];
    const evilHits: AttackHit[] = [];
    const carriesSecret = (hit: AttackHit): boolean => {
        const text = [hit.url, JSON.stringify(hit.headers), hit.body].join('\n');

        return forms.some((form) => text.includes(form));
    };

    const api: Server = createServer((request, response) => {
        const url = new URL(request.url ?? '/', 'http://api');

        if (url.pathname === '/open') {
            opens.push(hitOf(request, ''));
            response.writeHead(Number(url.searchParams.get('status') ?? '307'), {
                location: url.searchParams.get('to') ?? '/',
            });
            response.end();

            return;
        }

        void readBody(request).then((body) => {
            echoes.push(hitOf(request, body));
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ body, method: request.method, url: request.url }));
        });
    });
    const evil: Server = createServer((request, response) => {
        void readBody(request).then((body) => {
            evilHits.push(hitOf(request, body));
            response.setHeader('Content-Type', 'text/plain');
            response.end('stolen');
        });
    });

    await new Promise<void>((resolve) => {
        api.listen(0, '127.0.0.1', resolve);
    });
    await new Promise<void>((resolve) => {
        evil.listen(0, '127.0.0.1', resolve);
    });

    const portOf = (server: Server): number => (server.address() as AddressInfo).port;
    const close = (server: Server): Promise<void> => {
        server.closeAllConnections();

        return new Promise((resolve) => {
            server.close(() => {
                resolve();
            });
        });
    };

    return {
        api: `http://127.0.0.1:${String(portOf(api))}`,
        carriesSecret,
        close: async () => {
            await close(api);
            await close(evil);
        },
        echoes,
        evil: `http://127.0.0.1:${String(portOf(evil))}`,
        evilHits,
        opens,
    };
}
