import type { IncomingMessage, ServerResponse } from 'node:http';

/** What the sign-in endpoints write to: how many tokens they have handed out. */
export type TokenCount = { tokens: number };

/** A client credentials grant: a token that lives a minute, numbered by how many were handed out. */
function serveToken(seen: TokenCount, response: ServerResponse): void {
    seen.tokens += 1;
    response.setHeader('Content-Type', 'application/json');
    response.end(
        JSON.stringify({
            access_token: `tok-${String(seen.tokens)}`,
            expires_in: 60,
            token_type: 'Bearer',
        }),
    );
}

/** Opens a session: sets the cookie and sends the client on to `/me`, where it is echoed. */
function serveLogin(response: ServerResponse): void {
    response.writeHead(302, { Location: '/me', 'Set-Cookie': 'sid=e2e-session; Path=/' }).end();
}

/** The `cookie` header the request carried, or null when it carried none. */
function serveMe(request: IncomingMessage, response: ServerResponse): void {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ cookie: request.headers.cookie ?? null }));
}

/** The endpoints of the sign-in: the token, the login that sets a cookie, and where it is echoed. */
export function serveSignIn(
    pathname: string,
    request: IncomingMessage,
    response: ServerResponse,
    seen: TokenCount,
): boolean {
    const served: Record<string, () => void> = {
        '/login': () => {
            serveLogin(response);
        },
        '/me': () => {
            serveMe(request, response);
        },
        '/token': () => {
            serveToken(seen, response);
        },
    };

    served[pathname]?.();

    return pathname in served;
}
