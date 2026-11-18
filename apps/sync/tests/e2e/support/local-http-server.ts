import {
    createServer,
    type IncomingHttpHeaders,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

import { serveEntity } from './entity-routes.js';
import { serveGraphql } from './graphql-routes.js';
import { bodyOf } from './request-body.js';
import { serveSignIn } from './sign-in-routes.js';

/** What `/big` sends: more than the app keeps in memory, so it has to go to disk. */
const BIG_BODY_BYTES = 3 * 1024 * 1024;

/** What `/answer` sends: the weight of a typical JSON response, small next to `/big`. */
const ANSWER_BYTES = 4 * 1024;

/** How long `/slow` waits before it answers; the test cuts the send long before. */
const SLOW_MS = 30_000;

/** What one request to the echo carried, as the server saw it. */
type Echoed = { body: string; headers: IncomingHttpHeaders; url: string };

export type LocalHttpServer = {
    /** How many times `/answer` was asked, so a test can wait for a send by its count. */
    answers: () => number;
    /** The `authorization` of every request that reached `/whoami`, in order. */
    authorizations: string[];
    /** Every request that reached the echo, in order. */
    echoes: Echoed[];
    /** The query of every POST that reached `/graphql`, in order. */
    graphqlQueries: string[];
    /** `http://127.0.0.1:<port>`, the base every request of a test is written against. */
    origin: string;
    /** The path and the `authorization` of every request that reached `/pets/<id>`, in order. */
    pets: string[];
    /** The path and the `authorization` of every request that reached `/users/<id>`, in order. */
    users: string[];
    /** The port the server listens on, for the variable of an imported server address. */
    port: number;
    /** How many times `/token` was asked for a token, so a test can tell a reuse from a refetch. */
    tokenRequests: () => number;
    close: () => Promise<void>;
};

async function echo(
    request: IncomingMessage,
    response: ServerResponse,
    seen: Echoed[],
): Promise<void> {
    const body = await bodyOf(request);

    seen.push({ body, headers: request.headers, url: request.url ?? '' });

    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Echo', request.method ?? '');
    response.setHeader('Set-Cookie', ['sid=abc123; Path=/; HttpOnly', 'theme=dark; Path=/']);
    response.end(JSON.stringify({ body, method: request.method, url: request.url }));
}

/** The `authorization` the request carried, with its scheme said apart from the credential. */
function serveWhoami(request: IncomingMessage, response: ServerResponse, seen: Seen): void {
    const authorization = request.headers.authorization ?? null;

    seen.authorizations.push(authorization ?? '');

    response.setHeader('Content-Type', 'application/json');
    // The scheme is not the credential: the panel may show it where the value gets hidden.
    response.end(
        JSON.stringify({
            authorization,
            scheme: authorization === null ? null : (authorization.split(' ')[0] ?? null),
        }),
    );
}

/** What every endpoint of the run shares: what it has seen, written to by the routes. */
type Seen = {
    answers: number;
    authorizations: string[];
    echoes: Echoed[];
    graphqlQueries: string[];
    pets: string[];
    tokens: number;
    users: string[];
};

/** The endpoints that answer for themselves: a sign-in, an entity and an answer of fixed weight. */
function served(
    pathname: string,
    request: IncomingMessage,
    response: ServerResponse,
    seen: Seen,
): boolean {
    if (pathname !== '/answer') {
        return (
            serveSignIn(pathname, request, response, seen) ||
            serveEntity(pathname, request, response, seen)
        );
    }

    seen.answers += 1;
    response.setHeader('Content-Type', 'text/plain');
    response.end('x'.repeat(ANSWER_BYTES));

    return true;
}

function route(request: IncomingMessage, response: ServerResponse, seen: Seen): void {
    const { pathname } = new URL(request.url ?? '/', 'http://local');

    if (served(pathname, request, response, seen)) {
        return;
    }

    if (pathname === '/graphql') {
        serveGraphql(request, response, seen.graphqlQueries).catch(() => response.destroy());
    } else if (pathname === '/whoami') {
        serveWhoami(request, response, seen);
    } else if (pathname === '/redirect') {
        response.writeHead(302, { Location: '/echo' }).end();
    } else if (pathname === '/page') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end('<!doctype html><h1 id="greeting">hola desde el servidor</h1>');
    } else if (pathname === '/big') {
        response.setHeader('Content-Type', 'text/plain');
        response.end(Buffer.alloc(BIG_BODY_BYTES, 'x'));
    } else if (pathname === '/slow') {
        const timer = setTimeout(() => response.end('late'), SLOW_MS);

        response.on('close', () => {
            clearTimeout(timer);
        });
    } else {
        echo(request, response, seen.echoes).catch(() => response.destroy());
    }
}

/**
 * A server on a free port of this machine for the sends of a test to land on: an echo of what it
 * was sent with two cookies, a redirect to the echo, a body too big for memory, a slow one that a
 * test aborts, a GraphQL endpoint with a small schema, a token endpoint that counts its grants and
 * a login that sets a cookie and redirects to where it is echoed, and an answer of a fixed weight
 * that counts its asks. Each test starts its own and closes it.
 */
export async function startLocalHttpServer(): Promise<LocalHttpServer> {
    const seen: Seen = {
        answers: 0,
        authorizations: [],
        echoes: [],
        graphqlQueries: [],
        pets: [],
        tokens: 0,
        users: [],
    };
    const server: Server = createServer((request, response) => {
        route(request, response, seen);
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const { port } = server.address() as AddressInfo;

    return {
        answers: () => seen.answers,
        authorizations: seen.authorizations,
        close: () =>
            new Promise<void>((resolve) => {
                server.closeAllConnections();
                server.close(() => {
                    resolve();
                });
            }),
        echoes: seen.echoes,
        graphqlQueries: seen.graphqlQueries,
        origin: `http://127.0.0.1:${String(port)}`,
        pets: seen.pets,
        port,
        tokenRequests: () => seen.tokens,
        users: seen.users,
    };
}
