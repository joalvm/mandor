import type { ResponseCookie } from '@mandor/schema';

const SAME_SITE_NAME = { lax: 'Lax', none: 'None', strict: 'Strict' } as const;

/**
 * The attributes of a cookie as its `Set-Cookie` line wrote them, in the order that line
 * usually has: the words are the protocol's, so they are not translated.
 */
export function cookieAttributesOf(cookie: ResponseCookie): string[] {
    return [
        cookie.domain === undefined ? null : `Domain=${cookie.domain}`,
        cookie.path === undefined ? null : `Path=${cookie.path}`,
        cookie.expires === undefined ? null : `Expires=${cookie.expires}`,
        cookie.sameSite === undefined ? null : `SameSite=${SAME_SITE_NAME[cookie.sameSite]}`,
        cookie.secure ? 'Secure' : null,
        cookie.httpOnly ? 'HttpOnly' : null,
    ].filter((attribute) => attribute !== null);
}
