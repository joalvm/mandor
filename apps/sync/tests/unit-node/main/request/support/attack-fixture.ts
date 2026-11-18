import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { SendScripts } from '../../../../../src/main/request/request-scripts.js';
import type { RequestItem } from '@mandor/schema';

import { approvedScripts } from './approved-scripts.js';
import { SECRET, startSendFixture, type SendFixture } from './send-fixture.js';

/** What reached a server: the line, the headers and the body, as text. */
export type Hit = {
    method: string;
    url: string;
    headers: IncomingMessage['headers'];
    body: string;
};

/** A server of another origin that only listens: whatever a script steals ends up here. */
type Evil = { url: string; host: string; hits: Hit[]; close: () => Promise<void> };

/** The two servers of an attack, the sends against `api`, and the approvals the scripts got. */
export type Attack = SendFixture & { evil: Evil; asked: Set<string>; approved: Set<string> };

/** Every form of the secret a test looks for: as it is, in base64, in a URL and inside JSON. */
const SPELLINGS = [
    SECRET,
    Buffer.from(SECRET).toString('base64'),
    Buffer.from(SECRET).toString('base64url'),
    encodeURIComponent(SECRET),
    JSON.stringify(SECRET).slice(1, -1),
];

/** Whether a hit carries a form of the secret, in its line, a header or its body. */
export function carriesSecret(hit: Hit): boolean {
    const text = [hit.url, JSON.stringify(hit.headers), hit.body].join('\n');

    return SPELLINGS.some((spelling) => text.includes(spelling));
}

function hitOf(request: IncomingMessage, body: string): Hit {
    return { method: request.method ?? '', url: request.url ?? '', headers: request.headers, body };
}

async function listening(server: Server): Promise<string> {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return `127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

async function startEvil(): Promise<Evil> {
    const hits: Hit[] = [];
    const server = createServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            hits.push(hitOf(request, Buffer.concat(chunks).toString('utf8')));
            response.writeHead(200, { 'content-type': 'text/plain' });
            response.end('stolen');
        });
    });
    const host = await listening(server);

    return {
        url: `http://${host}`,
        host,
        hits,
        close: () => {
            server.closeAllConnections();

            return new Promise((resolve) => {
                server.close(() => {
                    resolve();
                });
            });
        },
    };
}

function json(response: ServerResponse, value: unknown): void {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(value));
}

/**
 * What `api` answers beside the echo of the fixture: `/open?to=…&status=…` is an open redirect,
 * `/token` gives an OAuth2 token, `/leak` answers with the secret in its body, and `/found`
 * moves to `evil` with a 302. `/reflect` hands the `X-Api-Key` it got back in a header and a cookie.
 */
function apiRoute(evil: () => string) {
    const routes: Record<
        string,
        (response: ServerResponse, query: URLSearchParams, request: IncomingMessage) => void
    > = {
        '/open': (response, query) => {
            response.writeHead(Number(query.get('status') ?? '307'), {
                location: query.get('to') ?? '/',
            });
            response.end();
        },
        '/token': (response) => {
            json(response, { access_token: 'at', token_type: 'Bearer', expires_in: 3600 });
        },
        '/leak': (response) => {
            json(response, { echoed: SECRET });
        },
        '/reflect': (response, _query, request) => {
            const key = String(request.headers['x-api-key'] ?? '');

            response.writeHead(200, {
                'content-type': 'text/plain',
                'x-reflect': key,
                'set-cookie': `k=${key}; Path=/`,
            });
            response.end('ok');
        },
        '/found': (response) => {
            response.writeHead(302, { location: `${evil()}/found` });
            response.end();
        },
    };

    return (request: IncomingMessage, response: ServerResponse): boolean => {
        const url = new URL(request.url ?? '/', 'http://api');
        const route = routes[url.pathname];

        route?.(response, url.searchParams, request);

        return route !== undefined;
    };
}

/** Approvals that remember what was asked: a test approves those texts, and only those. */
function rememberedApprovals(
    asked: Set<string>,
    approved: Set<string>,
): SendScripts['scripts']['approvals'] {
    return {
        isApproved: (key) => {
            asked.add(key);

            return Promise.resolve(approved.has(key));
        },
        approve: (key) => {
            approved.add(key);

            return Promise.resolve();
        },
        forgetAll: () => {
            approved.clear();

            return Promise.resolve();
        },
    };
}

/**
 * `api` (the fixture's server, with `baseUrl`, `base`, `tokenUrl` and `a = {{token}}` in the
 * environment) and `evil`. With `everyScript`, every script is approved; without it, only the
 * texts a test approves.
 */
export async function startAttack(everyScript = true): Promise<Attack> {
    const evil = await startEvil();
    const asked = new Set<string>();
    const approved = new Set<string>();
    const base = approvedScripts();
    const scripts = everyScript
        ? base
        : {
              ...base,
              scripts: { ...base.scripts, approvals: rememberedApprovals(asked, approved) },
          };
    const fixture = await startSendFixture(scripts, {
        route: apiRoute(() => evil.url),
        variables: [
            { name: 'base', value: '{{baseUrl}}', enabled: true, secret: false },
            { name: 'tokenUrl', value: '{{baseUrl}}/token', enabled: true, secret: false },
            { name: 'a', value: '{{token}}', enabled: true, secret: false },
        ],
    });

    return {
        ...fixture,
        evil,
        asked,
        approved,
        stop: async () => {
            await fixture.stop();
            await evil.close();
        },
    };
}

export function line(key: string, value: string) {
    return { key, value, enabled: true };
}

/** The scripts of a request: what runs before it leaves, and what reads its answer. */
export function scripts(
    onBeforeRequest: string | undefined,
    onResponse?: string,
): Pick<RequestItem, 'scripts'> {
    const before =
        onBeforeRequest === undefined ? {} : { onBeforeRequest: { source: onBeforeRequest } };
    const after = onResponse === undefined ? {} : { onResponse: { source: onResponse } };

    return { scripts: { ...before, ...after } };
}

/** The user's line that carries the secret, as the person wrote it. */
export const KEY_LINE = line('X-Api-Key', '{{token}}');
