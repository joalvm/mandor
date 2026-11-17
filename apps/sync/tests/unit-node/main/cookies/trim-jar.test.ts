import { Cookie, CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import {
    COOKIES_PER_DOMAIN,
    COOKIES_PER_JAR,
    trimJar,
} from '../../../../src/main/cookies/trim-jar.js';

const NOW = Date.parse('2026-10-29T12:00:00.000Z');

/** A cookie of the domain last used `minutesAgo` before now, alive or long gone. */
function cookieOf(domain: string, name: string, minutesAgo: number, expired = false): Cookie {
    const used = new Date(NOW - minutesAgo * 60_000);

    return new Cookie({
        key: name,
        value: 'v',
        domain,
        path: '/',
        creation: used,
        lastAccessed: used,
        expires: expired ? new Date(NOW - 1000) : 'Infinity',
    });
}

async function jarOf(cookies: Cookie[]): Promise<CookieJar> {
    const jar = new CookieJar();

    for (const cookie of cookies) {
        await jar.store.putCookie(cookie);
    }

    return jar;
}

async function namesIn(jar: CookieJar): Promise<string[]> {
    return (await jar.store.getAllCookies()).map((cookie) => cookie.key);
}

describe('the cap on what one jar keeps (trim-jar)', () => {
    it('leaves alone a jar within both caps', async () => {
        const jar = await jarOf([cookieOf('a.test', 'one', 1), cookieOf('b.test', 'two', 2)]);

        await trimJar(jar, NOW);

        expect(await namesIn(jar)).toEqual(['one', 'two']);
    });

    /** What a browser does too: one server cannot make every send carry thousands of cookies. */
    it('lets one domain keep as many as a browser, dropping the one used longest ago', async () => {
        const cookies = Array.from({ length: COOKIES_PER_DOMAIN + 1 }, (_, index) =>
            cookieOf('a.test', `c${String(index)}`, index),
        );
        const jar = await jarOf(cookies);

        await trimJar(jar, NOW);

        const kept = await namesIn(jar);

        expect(kept).toHaveLength(COOKIES_PER_DOMAIN);
        expect(kept).not.toContain(`c${String(COOKIES_PER_DOMAIN)}`);
        expect(kept).toContain('c0');
    });

    it('drops a cookie that expired before one still alive, however recently used', async () => {
        const cookies = Array.from({ length: COOKIES_PER_DOMAIN }, (_, index) =>
            cookieOf('a.test', `c${String(index)}`, 10 + index),
        );
        const jar = await jarOf([...cookies, cookieOf('a.test', 'gone', 0, true)]);

        await trimJar(jar, NOW);

        const kept = await namesIn(jar);

        expect(kept).toHaveLength(COOKIES_PER_DOMAIN);
        expect(kept).not.toContain('gone');
    });

    /** Spread over many hosts, a server still meets the cap of the whole jar. */
    it('caps the whole jar across domains, dropping the ones used longest ago', async () => {
        const domains = Math.ceil(COOKIES_PER_JAR / 100) + 1;
        const cookies = Array.from({ length: domains * 100 }, (_, index) =>
            cookieOf(`d${String(index % domains)}.test`, `c${String(index)}`, index),
        );
        const jar = await jarOf(cookies);

        await trimJar(jar, NOW);

        const kept = await namesIn(jar);

        expect(kept).toHaveLength(COOKIES_PER_JAR);
        expect(kept).toContain('c0');
        expect(kept).not.toContain(`c${String(domains * 100 - 1)}`);
    });
});
