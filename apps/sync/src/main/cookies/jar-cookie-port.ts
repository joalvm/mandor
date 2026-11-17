import type { CookiePort } from '@mandor/transport-sync';
import { Cookie, type CookieJar } from 'tough-cookie';

import { trimJar } from './trim-jar.js';

/** What a browser keeps of one cookie, name and value together, in bytes (RFC 6265bis, 5.7). */
export const COOKIE_BYTES = 4096;

/**
 * Whether one `Set-Cookie` line fits what a browser keeps. Past it, a server could fill the jar
 * with cookies as large as a header allows, and every later send would carry them all.
 */
function fitsBrowser(line: string): boolean {
    const cookie = Cookie.parse(line);

    return cookie === undefined || Buffer.byteLength(cookie.key + cookie.value) <= COOKIE_BYTES;
}

/** A port over a jar that also says whether the answers it saw changed the jar. */
export type JarCookiePort = CookiePort & { changed: () => boolean };

/**
 * The transport's port over a jar. The jar matches domain, path and `Secure` against each hop's
 * URL, so the transport only asks and hands over. A `Set-Cookie` the jar refuses — malformed, for
 * another domain — is dropped with `ignoreError`: a bad line of a server never breaks a send.
 * So is one past the size a browser keeps.
 * An answer that set something is followed by the cap of the jar.
 */
export function jarCookiePort(jar: CookieJar): JarCookiePort {
    let changed = false;

    return {
        header: async (url) => {
            const header = await jar.getCookieString(url);

            return header === '' ? null : header;
        },
        store: async (url, setCookies) => {
            let set = false;

            for (const line of setCookies.filter(fitsBrowser)) {
                // Sequential on purpose: when a server sets one name twice, the last line wins.

                const kept = await jar.setCookie(line, url, { ignoreError: true });

                set ||= kept !== undefined;
            }

            if (set) {
                changed = true;
                await trimJar(jar);
            }
        },
        changed: () => changed,
    };
}
