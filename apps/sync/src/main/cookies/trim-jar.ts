import type { Cookie, CookieJar } from 'tough-cookie';

/**
 * What a jar keeps, by Chrome's numbers: per domain, and in all. Without a cap a server could
 * set a new cookie on every answer, and every later send would carry them all.
 */
export const COOKIES_PER_DOMAIN = 180;

export const COOKIES_PER_JAR = 3300;

/** When a cookie was last sent or set; one that never says goes first. */
function lastUsedOf(cookie: Cookie): number {
    const at = cookie.lastAccessed ?? cookie.creation;

    return at instanceof Date ? at.getTime() : 0;
}

/** The order cookies leave in: the expired before the alive, then the one used longest ago. */
function inLeavingOrder(cookies: Cookie[], now: number): Cookie[] {
    const isAlive = (cookie: Cookie): number => Number((cookie.expiryTime() ?? Infinity) > now);

    return cookies.toSorted(
        (one, other) => isAlive(one) - isAlive(other) || lastUsedOf(one) - lastUsedOf(other),
    );
}

/** The cookies past the cap of their domain, in leaving order. */
function pastDomainCap(ordered: Cookie[]): Set<Cookie> {
    const byDomain = new Map<string, Cookie[]>();

    for (const cookie of ordered) {
        const domain = cookie.domain ?? '';
        const group = byDomain.get(domain);

        if (group === undefined) {
            byDomain.set(domain, [cookie]);
        } else {
            group.push(cookie);
        }
    }

    const past = [...byDomain.values()].flatMap((each) =>
        each.slice(0, Math.max(0, each.length - COOKIES_PER_DOMAIN)),
    );

    return new Set(past);
}

/**
 * Takes out of the jar what is past either cap. Run after an answer changed the jar, so the
 * cookies it just set, the newest of all, are the last to go.
 */
export async function trimJar(jar: CookieJar, now = Date.now()): Promise<void> {
    const ordered = inLeavingOrder(await jar.store.getAllCookies(), now);
    const leaving = pastDomainCap(ordered);
    const staying = ordered.filter((cookie) => !leaving.has(cookie));

    staying.slice(0, Math.max(0, staying.length - COOKIES_PER_JAR)).forEach((cookie) => {
        leaving.add(cookie);
    });

    for (const cookie of leaving) {
        await jar.store.removeCookie(cookie.domain ?? '', cookie.path ?? '', cookie.key);
    }
}
