import type { SyncRequest } from '../request/sync-request.js';
import { SyncSendError } from '../send/sync-send-error.js';

/** The next request of a redirect chain, plus the credential headers the hop dropped. */
export type RedirectedRequest = {
    request: SyncRequest;
    strippedHeaders: string[];
};

type Headers = readonly (readonly [string, string])[];

const CREDENTIAL_HEADERS = ['authorization', 'proxy-authorization', 'cookie'];
// Fetch §4.4: the headers that describe the request body leave with it.
const BODY_HEADERS = [
    'content-length',
    'content-type',
    'content-encoding',
    'content-language',
    'content-location',
];
/** The schemes a hop may land on: a `file:` location never becomes a request. */
const FOLLOWED_SCHEMES = ['http:', 'https:'];

/** The method a status sends the next hop with, or none when the hop keeps method and body. */
type MethodRewrite = (method: string, keepMethod: boolean) => string | undefined;

/** 303 sends the next hop as a GET; a HEAD stays a HEAD, it asks for no body already. */
function seeOtherMethod(method: string): string {
    if (method === 'HEAD') {
        return method;
    }

    return 'GET';
}

/** The classic 301 and 302 turn a POST into a GET, as browsers do, unless the request keeps it. */
function classicMethod(method: string, keepMethod: boolean): string | undefined {
    if (method !== 'POST' || keepMethod) {
        return undefined;
    }

    return 'GET';
}

/** What each status does to the method. 307, 308 and anything absent keep everything. */
const REWRITE_OF_STATUS: ReadonlyMap<number, MethodRewrite> = new Map<number, MethodRewrite>([
    [301, classicMethod],
    [302, classicMethod],
    [303, seeOtherMethod],
]);

function withoutHeaders(headers: Headers, dropped: readonly string[]): Headers {
    return headers.filter(([name]) => !dropped.includes(name.toLowerCase()));
}

function locationOf(location: string, from: URL): URL {
    try {
        return new URL(location, from);
    } catch {
        throw new SyncSendError('redirect-scheme', `refused redirect location: ${location}`);
    }
}

/** Resolves the location against the previous URL and refuses what must never become a request. */
function targetOf(previous: SyncRequest, location: string): URL {
    const to = locationOf(location, new URL(previous.url));

    if (!FOLLOWED_SCHEMES.includes(to.protocol)) {
        throw new SyncSendError('redirect-scheme', `refused redirect location: ${location}`);
    }

    return to;
}

/**
 * On a cross-origin hop the credentials of one origin are not the business of the next. A
 * request that keeps its authorization — Postman's `followAuthorizationHeader` — takes
 * `Authorization` along; the cookies and the proxy's credential leave all the same.
 */
function strippedOf(previous: SyncRequest, to: URL): RedirectedRequest['strippedHeaders'] {
    const dropped =
        previous.redirects.keepAuthorization === true
            ? CREDENTIAL_HEADERS.filter((name) => name !== 'authorization')
            : CREDENTIAL_HEADERS;

    if (to.origin === new URL(previous.url).origin) {
        return [];
    }

    const guarded = (previous.redirects.crossOriginGuard?.headers ?? []).map((name) =>
        name.toLowerCase(),
    );

    return previous.headers
        .map(([name]) => name.toLowerCase())
        .filter((lowered) => dropped.includes(lowered) || guarded.includes(lowered));
}

/** The method, body and headers the status sends: a rewritten method leaves without the body. */
function afterStatus(
    request: SyncRequest,
    status: number,
): Pick<SyncRequest, 'method' | 'body' | 'headers'> {
    const rewrite = REWRITE_OF_STATUS.get(status);
    const method = rewrite?.(request.method, request.redirects.keepMethod === true);

    if (method === undefined) {
        return { method: request.method, body: request.body, headers: request.headers };
    }

    return { method, body: undefined, headers: withoutHeaders(request.headers, BODY_HEADERS) };
}

/**
 * Whether the guard of a send a script shaped keeps this hop from being followed: it leaves the
 * origin and would carry a body with a secret, or its location holds a form of one. Removing the
 * lines is enough for the headers; a body or a URL cannot lose a secret and stay what it was.
 */
export function heldByGuard(previous: SyncRequest, status: number, location: string): boolean {
    const guard = previous.redirects.crossOriginGuard;

    if (
        guard === undefined ||
        targetOf(previous, location).origin === new URL(previous.url).origin
    ) {
        return false;
    }

    const keepsBody = afterStatus(previous, status).body !== undefined;

    return (
        (keepsBody && guard.bodySecret) ||
        guard.spellings.some((spelling) => spelling !== '' && location.includes(spelling))
    );
}

/**
 * The single request a redirect hop produces. Location resolves against the previous URL; a
 * scheme that is not `http:` or `https:` dies with `redirect-scheme` (a `file:` location never
 * becomes a request). A drop from `https:` to `http:` is followed, as curl, Postman, Bruno and
 * Insomnia follow it, and is a change of origin like any other. Leaving the origin strips the
 * credential headers — `Authorization` stays when the request keeps it — and names them, so the
 * response can show what was not sent. 303 and the classic 301/302 of a POST turn into a bodyless
 * GET — unless the request keeps its method — and the body headers leave with the body; 307 and
 * 308 keep everything.
 */
export function redirectedRequest(
    previous: SyncRequest,
    status: number,
    location: string,
): RedirectedRequest {
    const to = targetOf(previous, location);
    const strippedHeaders = strippedOf(previous, to);
    const { method, body, headers } = afterStatus(
        { ...previous, headers: withoutHeaders(previous.headers, strippedHeaders) },
        status,
    );

    return {
        request: { ...previous, url: String(to), method, headers, body },
        strippedHeaders,
    };
}
