import { CookieJar } from 'tough-cookie';
import { beforeEach, describe, expect, it } from 'vitest';

import { COOKIES_PER_DOMAIN } from '../../../../src/main/cookies/trim-jar.js';
import { putCookieLine } from '../../../../src/main/cookies/put-cookie-line.js';

let jar: CookieJar;

beforeEach(() => {
    jar = new CookieJar();
});

async function stored(): Promise<
    {
        domain: string | null;
        path: string | null;
        key: string;
        value: string;
        hostOnly: boolean | null;
    }[]
> {
    const cookies = await jar.store.getAllCookies();

    return cookies.map(({ domain, path, key, value, hostOnly }) => ({
        domain,
        path,
        key,
        value,
        hostOnly,
    }));
}

describe('writing a cookie from its line', () => {
    it('keeps a line without Domain on the host it was written for, at the root', async () => {
        await expect(putCookieLine(jar, { domain: 'api.test', line: 'sid=abc' })).resolves.toEqual({
            ok: true,
            value: {},
        });

        expect(await stored()).toEqual([
            { domain: 'api.test', path: '/', key: 'sid', value: 'abc', hostOnly: true },
        ]);
    });

    it('takes the domain, the path and the flags the line names', async () => {
        await putCookieLine(jar, {
            domain: 'api.test',
            line: 'sid=abc; Domain=api.test; Path=/v1; Secure; HttpOnly; SameSite=Strict',
        });

        const [cookie] = await jar.store.getAllCookies();

        expect(cookie).toMatchObject({
            domain: 'api.test',
            path: '/v1',
            hostOnly: false,
            secure: true,
            httpOnly: true,
            sameSite: 'strict',
        });
    });

    it('refuses a line for a domain the host does not belong to', async () => {
        await expect(
            putCookieLine(jar, { domain: 'api.test', line: 'sid=abc; Domain=other.test' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(await stored()).toEqual([]);
    });

    it.each(['no pair at all', '=abc', 'sid=a\nb=c'])(
        'refuses a line that is no cookie: %j',
        async (line) => {
            await expect(putCookieLine(jar, { domain: 'api.test', line })).resolves.toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
            expect(await stored()).toEqual([]);
        },
    );

    it.each(['api.test/v1', 'https://api.test', 'API.test'])(
        'refuses a domain that is not a bare host: %j',
        async (domain) => {
            await expect(putCookieLine(jar, { domain, line: 'sid=abc' })).resolves.toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
        },
    );
});

describe('writing over the cookie a line was opened from', () => {
    const SID = { domain: 'api.test', path: '/', name: 'sid' };

    beforeEach(async () => {
        await putCookieLine(jar, { domain: 'api.test', line: 'sid=old' });
    });

    it('changes the cookie in place when the line still names it', async () => {
        await putCookieLine(jar, { domain: 'api.test', line: 'sid=new', replaces: SID });

        expect((await stored()).map(({ key, value }) => `${key}=${value}`)).toEqual(['sid=new']);
    });

    it('leaves no copy of it behind when the line renames it', async () => {
        await putCookieLine(jar, { domain: 'api.test', line: 'session=new', replaces: SID });

        expect((await stored()).map(({ key }) => key)).toEqual(['session']);
    });

    it('keeps it when the new line is refused', async () => {
        await putCookieLine(jar, { domain: 'api.test', line: '=broken', replaces: SID });

        expect((await stored()).map(({ key, value }) => `${key}=${value}`)).toEqual(['sid=old']);
    });
});

describe('the cap of the jar, for a line written by hand', () => {
    it('holds a domain to its cap, as for the cookies of a server', async () => {
        for (let index = 0; index <= COOKIES_PER_DOMAIN; index += 1) {
            await putCookieLine(jar, { domain: 'api.test', line: `c${String(index)}=1` });
        }

        expect(await stored()).toHaveLength(COOKIES_PER_DOMAIN);
    });
});
