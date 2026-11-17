import type { CookieRow } from '@mandor/ipc';
import type { Cookie } from 'tough-cookie';

import { sameSiteOf } from './same-site-of.js';

/** The end the jar honors, `Max-Age` included; a cookie of the session has none. */
function expiresOf(cookie: Cookie): string | null {
    const end = cookie.expiryTime();

    return end === undefined || !Number.isFinite(end) ? null : new Date(end).toISOString();
}

/** A cookie of the jar as the window sees it. */
export function cookieRowOf(cookie: Cookie): CookieRow {
    return {
        domain: cookie.domain ?? '',
        path: cookie.path ?? '/',
        name: cookie.key,
        value: cookie.value,
        expires: expiresOf(cookie),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: sameSiteOf(cookie) ?? null,
    };
}
