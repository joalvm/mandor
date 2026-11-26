import { failure, success, type Empty, type Result } from '@mandor/ipc';
import type { Cookie, CookieJar } from 'tough-cookie';

import { trimJar } from './trim-jar.js';

/** What names one cookie of a jar. */
type CookieIdentity = { domain: string; path: string; name: string };

/** What a line written by hand asks the jar for: where it is set from, and what it replaces. */
type CookieLine = { domain: string; line: string; replaces?: CookieIdentity | undefined };

const NOT_A_COOKIE = 'The line is not a cookie of that domain';

/**
 * The address a cookie of `domain` is set from, as if its server had answered there. `https`, so
 * a `Secure` line is kept like any other. A domain that is not a bare host has none.
 */
function addressOf(domain: string): string | null {
    const url = URL.parse(`https://${domain}/`);

    return url?.hostname === domain ? url.href : null;
}

/** Whether the cookie the line became is the one it was opened from. */
function isSame(cookie: Cookie, named: CookieIdentity): boolean {
    return (
        cookie.domain === named.domain && cookie.path === named.path && cookie.key === named.name
    );
}

/**
 * Writes the cookie of a `Set-Cookie` line into the jar the way a server of the domain would: the
 * jar decides its domain, path and end, and refuses a line that is no cookie of that domain. A
 * line break would cut the line short without a word, so it is refused too. The cookie the line
 * was opened from leaves only after the new one is in, and only when the line named another one.
 */
export async function putCookieLine(jar: CookieJar, input: CookieLine): Promise<Result<Empty>> {
    const address = addressOf(input.domain);

    if (address === null || /\p{Cc}/u.test(input.line)) {
        return failure('bad-request', NOT_A_COOKIE);
    }

    const kept = await jar.setCookie(input.line, address, { ignoreError: true });

    if (kept === undefined) {
        return failure('bad-request', NOT_A_COOKIE);
    }

    const { replaces } = input;

    if (replaces !== undefined && !isSame(kept, replaces)) {
        await jar.store.removeCookie(replaces.domain, replaces.path, replaces.name);
    }

    await trimJar(jar);

    return success({});
}
