import { CookieJar } from 'tough-cookie';
import { describe, expect, it } from 'vitest';

import { COOKIE_BYTES, jarCookiePort } from '../../../../src/main/cookies/jar-cookie-port.js';
import { COOKIES_PER_DOMAIN } from '../../../../src/main/cookies/trim-jar.js';

describe('the port of the transport over a jar', () => {
    it('sends nothing while the jar holds nothing for the URL', async () => {
        const port = jarCookiePort(new CookieJar());

        await expect(port.header('https://a.test/')).resolves.toBeNull();
        expect(port.changed()).toBe(false);
    });

    it('keeps what an answer sets and sends it back to the URLs it matches', async () => {
        const port = jarCookiePort(new CookieJar());

        await port.store('https://a.test/login', [
            'sid=abc; Path=/; HttpOnly',
            'theme=dark; Path=/',
        ]);

        await expect(port.header('https://a.test/me')).resolves.toBe('sid=abc; theme=dark');
        await expect(port.header('https://other.test/')).resolves.toBeNull();
        expect(port.changed()).toBe(true);
    });

    it('does not send a cookie outside its path', async () => {
        const port = jarCookiePort(new CookieJar());

        await port.store('https://a.test/api/login', ['sid=abc; Path=/api']);

        await expect(port.header('https://a.test/api/me')).resolves.toBe('sid=abc');
        await expect(port.header('https://a.test/other')).resolves.toBeNull();
    });

    it('does not send a Secure cookie over plain http', async () => {
        const port = jarCookiePort(new CookieJar());

        await port.store('https://a.test/', ['sid=abc; Secure']);

        await expect(port.header('http://a.test/')).resolves.toBeNull();
    });

    it('drops a Set-Cookie it cannot take and goes on with the rest', async () => {
        const port = jarCookiePort(new CookieJar());

        await port.store('https://a.test/', ['not a cookie', 'sid=abc; Domain=other.test', 'ok=1']);

        await expect(port.header('https://a.test/')).resolves.toBe('ok=1');
    });

    it('does not say it changed when every line was refused', async () => {
        const port = jarCookiePort(new CookieJar());

        await port.store('https://a.test/', ['sid=abc; Domain=other.test']);

        expect(port.changed()).toBe(false);
    });

    it('keeps no more cookies of one domain than a browser would, the newest first', async () => {
        const jar = new CookieJar();
        const port = jarCookiePort(jar);
        const lines = Array.from(
            { length: COOKIES_PER_DOMAIN + 20 },
            (_, index) => `c${String(index)}=v`,
        );

        await port.store('https://a.test/', lines);

        const kept = (await jar.store.getAllCookies()).map((cookie) => cookie.key);

        expect(kept).toHaveLength(COOKIES_PER_DOMAIN);
        expect(kept).toContain(`c${String(COOKIES_PER_DOMAIN + 19)}`);
        expect(kept).not.toContain('c0');
    });

    /** RFC 6265bis, 5.7: a name and value past 4096 bytes together are ignored, as a browser does. */
    it('drops a cookie whose name and value pass the size a browser keeps', async () => {
        const port = jarCookiePort(new CookieJar());
        const fits = 'é'.repeat((COOKIE_BYTES - 'fits'.length) / 2);

        await port.store('https://a.test/', [`big=${'x'.repeat(COOKIE_BYTES)}`, `fits=${fits}`]);

        await expect(port.header('https://a.test/')).resolves.toBe(`fits=${fits}`);
    });

    it('lets the last line win when a server sets one name twice', async () => {
        const port = jarCookiePort(new CookieJar());

        await port.store('https://a.test/', ['sid=one', 'sid=two']);

        await expect(port.header('https://a.test/')).resolves.toBe('sid=two');
    });
});
