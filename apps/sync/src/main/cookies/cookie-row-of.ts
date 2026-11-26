import type { CookieRow } from '@mandor/ipc';
import type { Cookie } from 'tough-cookie';

import { sameSiteOf } from './same-site-of.js';

/** The words of the protocol for each same-site rule, as a `Set-Cookie` line writes them. */
const SAME_SITE_WORD = { lax: 'Lax', none: 'None', strict: 'Strict' } as const;

/** The end the jar honors, `Max-Age` included; a cookie of the session has none. */
function endOf(cookie: Cookie): Date | null {
    const end = cookie.expiryTime();

    return end === undefined || !Number.isFinite(end) ? null : new Date(end);
}

/**
 * The attributes of a cookie as a `Set-Cookie` line writes them. `Domain` only for a cookie that
 * also goes to the subdomains: one set without it stays on its host, and a line that named it
 * would widen it. The end is the one the jar honors, written as `Expires`, so the line does not
 * drift the way a `Max-Age` counted again from each save would.
 */
function attributesOf(cookie: Cookie): string[] {
    const end = endOf(cookie);
    const sameSite = sameSiteOf(cookie);

    return [
        cookie.hostOnly === true || cookie.domain === null ? '' : `Domain=${cookie.domain}`,
        `Path=${cookie.path ?? '/'}`,
        end === null ? '' : `Expires=${end.toUTCString()}`,
        cookie.secure ? 'Secure' : '',
        cookie.httpOnly ? 'HttpOnly' : '',
        sameSite === undefined ? '' : `SameSite=${SAME_SITE_WORD[sameSite]}`,
    ].filter((attribute) => attribute !== '');
}

/** A cookie of the jar as a server would set it again: the text its editor opens with. */
function lineOf(cookie: Cookie): string {
    return [`${cookie.key}=${cookie.value}`, ...attributesOf(cookie)].join('; ');
}

/** A cookie of the jar as the window sees it. */
export function cookieRowOf(cookie: Cookie): CookieRow {
    return {
        line: lineOf(cookie),
        domain: cookie.domain ?? '',
        path: cookie.path ?? '/',
        name: cookie.key,
        value: cookie.value,
        expires: endOf(cookie)?.toISOString() ?? null,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: sameSiteOf(cookie) ?? null,
    };
}
