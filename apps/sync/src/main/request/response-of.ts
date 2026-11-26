import { graphqlErrorsOf } from '@mandor/graphql';
import type { HttpResponse, RequestBodyType, ResponseBody, ResponseCookie } from '@mandor/schema';
import type { SyncBody, SyncResponse } from '@mandor/transport-sync';
import { Cookie, defaultPath } from 'tough-cookie';

import { sameSiteOf } from '../cookies/same-site-of.js';

const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

/** How bytes cross the bridge: as text when they are utf-8, as base64 when they are not. */
export type EncodedBytes =
    { encoding: 'utf8'; text: string } | { encoding: 'base64'; data: string };

/** The bytes an encoded body stands for, read back the way they were written. */
export function decodedBytes(body: EncodedBytes): Buffer {
    if (body.encoding === 'utf8') {
        return Buffer.from(body.text, 'utf8');
    }

    return Buffer.from(body.data, 'base64');
}

/** Bytes the way they cross the bridge: text when they read as utf-8, base64 when not. */
export function encodingOf(bytes: Uint8Array): EncodedBytes {
    try {
        return { encoding: 'utf8', text: STRICT_UTF8.decode(bytes) };
    } catch {
        return { encoding: 'base64', data: Buffer.from(bytes).toString('base64') };
    }
}

function bodyOf(
    body: SyncBody,
    headers: SyncResponse['headers'],
    bodyBytes: number,
): ResponseBody | null {
    if (bodyBytes === 0) {
        return null;
    }

    if (body.kind === 'spilled') {
        const type = headers.find(([name]) => name.toLowerCase() === 'content-type')?.[1];

        return {
            kind: 'stored',
            ref: body.ref,
            bytes: body.bytes,
            contentType: type ?? 'application/octet-stream',
        };
    }

    return { kind: 'inline', ...encodingOf(body.bytes) };
}

/** Where the answer came from: what a cookie that names no `Domain` or `Path` is kept under. */
type AnsweredAt = { host: string; path: string };

/** The last hop of a followed redirect answered; without one, the URL that was asked. */
function answeredAtOf(response: SyncResponse, url: string): AnsweredAt | null {
    const answered = URL.parse(response.redirects.at(-1)?.to ?? url);

    return answered === null
        ? null
        : { host: answered.hostname, path: defaultPath(answered.pathname) };
}

/** When a cookie stops being sent, as a date; none for one that lasts the session. */
function expiresOf(cookie: Cookie, now: Date): { expires?: string } {
    const expiry = cookie.expiryTime(now);

    if (expiry === undefined || !Number.isFinite(expiry)) {
        return {};
    }

    return { expires: new Date(expiry).toISOString() };
}

/**
 * One `Set-Cookie` line as the jar keeps it: a line that names no `Domain` belongs to the host
 * that answered, and one with no `Path` to the directory of the path asked, as the cookie
 * standard has it and as Postman shows it.
 */
function cookieOf(line: string, now: Date, at: AnsweredAt | null): ResponseCookie | null {
    const cookie = Cookie.parse(line);

    if (cookie === undefined) {
        return null;
    }

    const sameSite = sameSiteOf(cookie);
    const domain = cookie.domain ?? at?.host;
    const path = cookie.path ?? at?.path;

    return {
        name: cookie.key,
        value: cookie.value,
        ...(domain === undefined ? {} : { domain }),
        ...(path === undefined ? {} : { path }),
        ...expiresOf(cookie, now),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        ...(sameSite === undefined ? {} : { sameSite }),
    };
}

/**
 * A GraphQL server answers a failed operation with a 200, so the status cannot tell: the
 * `errors` of a body that was sent as GraphQL and came back as text can.
 */
function graphqlErrorsOfBody(
    body: ResponseBody | null,
    sent: RequestBodyType,
): HttpResponse['graphqlErrors'] {
    if (sent !== 'graphql' || body?.kind !== 'inline' || body.encoding !== 'utf8') {
        return undefined;
    }

    return graphqlErrorsOf(body.text) ?? undefined;
}

/**
 * The response of the transport as it crosses the bridge: bytes never travel raw, because the
 * bridge redacts an answer by walking it. `now` anchors a cookie that expires in so many seconds;
 * `sent` is the kind of body the request carried, which says what the answer is read as; `url`
 * is the one asked, which places a cookie that does not say where it belongs.
 */
export function httpResponseOf(
    response: SyncResponse,
    now: Date,
    sent: RequestBodyType,
    url: string,
): HttpResponse {
    const at = answeredAtOf(response, url);
    const cookies = response.headers
        .filter(([name]) => name.toLowerCase() === 'set-cookie')
        .map(([, line]) => cookieOf(line, now, at))
        .filter((cookie): cookie is ResponseCookie => cookie !== null);

    const body = bodyOf(response.body, response.headers, response.sizes.bodyBytes);
    const graphqlErrors = graphqlErrorsOfBody(body, sent);

    return {
        status: response.status,
        statusText: response.statusText,
        httpVersion: response.httpVersion,
        headers: response.headers.map(([name, value]) => [name, value]),
        body,
        sizes: response.sizes,
        timings: response.timings,
        redirects: response.redirects,
        cookies,
        ...(response.network === undefined ? {} : { network: response.network }),
        ...(graphqlErrors === undefined ? {} : { graphqlErrors }),
    };
}
