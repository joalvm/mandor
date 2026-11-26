import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { closeRepo, openRepo, spyIpc, type IpcSpy } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createCookieJarStore,
    type CookieJarStore,
} from '../../../../src/main/cookies/cookie-jar-store.js';
import { registerCookiesHandlers } from '../../../../src/main/cookies/cookies.handlers.js';

const PLACE = { workspaceId: 'payments', environmentId: 'staging' };
const SID = { ...PLACE, domain: 'api.example.com', path: '/', name: 'sid' };

let root: string;
let ipc: IpcSpy;
let jars: CookieJarStore;
let dispose: () => void;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-cookies-'));
    ipc = spyIpc();
    jars = createCookieJarStore();
    dispose = registerCookiesHandlers(ipc, jars);
    openRepo(root);

    const jar = await jars.jarOf({ root, ...PLACE });

    await jar.setCookie(
        'sid=abc; Path=/; Secure; HttpOnly; SameSite=Lax',
        'https://api.example.com/',
    );
    await jar.setCookie('theme=dark; Path=/app', 'https://api.example.com/app');
    await jar.setCookie('old=1; Max-Age=0', 'https://api.example.com/');
});

afterEach(async () => {
    dispose();
    closeRepo();
    await rm(root, { recursive: true, force: true });
});

async function names(): Promise<string[]> {
    const answer = (await ipc.call(CHANNELS.cookiesList, PLACE)) as {
        ok: boolean;
        value?: { cookies: { name: string }[] };
    };

    return answer.value?.cookies.map((cookie) => cookie.name) ?? [];
}

describe('listing the jar', () => {
    it('lists each cookie with what identifies it and its flags', async () => {
        const answer = await ipc.call(CHANNELS.cookiesList, PLACE);

        expect(answer).toMatchObject({
            ok: true,
            value: {
                cookies: expect.arrayContaining([
                    {
                        line: 'sid=abc; Path=/; Secure; HttpOnly; SameSite=Lax',
                        domain: 'api.example.com',
                        path: '/',
                        name: 'sid',
                        value: 'abc',
                        expires: null,
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                    },
                ]) as unknown,
            },
        });
    });

    it('does not list a cookie that is already over', async () => {
        expect(await names()).toEqual(expect.not.arrayContaining(['old']));
    });

    it('lists nothing for an environment whose jar was never filled', async () => {
        await expect(
            ipc.call(CHANNELS.cookiesList, { ...PLACE, environmentId: 'prod' }),
        ).resolves.toEqual({ ok: true, value: { cookies: [] } });
    });

    it('refuses while no origin is open', async () => {
        closeRepo();

        await expect(ipc.call(CHANNELS.cookiesList, PLACE)).resolves.toMatchObject({ ok: false });
    });

    it('refuses a request that is not the shape of one', async () => {
        await expect(ipc.call(CHANNELS.cookiesList, { workspaceId: 5 })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('changing the jar', () => {
    const EDITED = {
        ...PLACE,
        domain: 'api.example.com',
        line: 'sid=new; Path=/; Secure; HttpOnly',
        replaces: { domain: 'api.example.com', path: '/', name: 'sid' },
    };

    it('writes over a cookie from the line its editor hands back', async () => {
        await expect(ipc.call(CHANNELS.cookiesSet, EDITED)).resolves.toEqual({
            ok: true,
            value: {},
        });

        const jar = await jars.jarOf({ root, ...PLACE });
        const [cookie] = await jar.getCookies('https://api.example.com/');

        expect(cookie).toMatchObject({ key: 'sid', value: 'new', httpOnly: true, secure: true });
    });

    it('keeps the change on disk', async () => {
        await ipc.call(CHANNELS.cookiesSet, EDITED);

        const reread = createCookieJarStore();
        const jar = await reread.jarOf({ root, ...PLACE });

        expect((await jar.getCookies('https://api.example.com/')).map((c) => c.value)).toEqual([
            'new',
        ]);
    });

    it('adds a cookie to a domain the jar did not know', async () => {
        await ipc.call(CHANNELS.cookiesSet, { ...PLACE, domain: 'new.test', line: 'a=1' });

        const jar = await jars.jarOf({ root, ...PLACE });

        expect((await jar.getCookies('https://new.test/')).map((c) => c.key)).toEqual(['a']);
    });

    it('refuses a line that is no cookie, and leaves the jar as it was', async () => {
        await expect(
            ipc.call(CHANNELS.cookiesSet, { ...EDITED, line: '=broken' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(await names()).toEqual(['sid', 'theme']);
    });

    it('deletes one cookie and leaves the others', async () => {
        await expect(ipc.call(CHANNELS.cookiesDelete, SID)).resolves.toEqual({
            ok: true,
            value: {},
        });

        expect(await names()).toEqual(['theme']);
    });

    it('empties the jar', async () => {
        await expect(ipc.call(CHANNELS.cookiesClear, PLACE)).resolves.toEqual({
            ok: true,
            value: {},
        });

        expect(await names()).toEqual([]);
    });

    it('takes out the cookies of one domain and leaves the others', async () => {
        const jar = await jars.jarOf({ root, ...PLACE });

        await jar.setCookie('other=1; Path=/', 'https://other.test/');

        await expect(
            ipc.call(CHANNELS.cookiesClear, { ...PLACE, domain: 'api.example.com' }),
        ).resolves.toEqual({ ok: true, value: {} });
        expect(await names()).toEqual(['other']);
    });

    it('does not touch the jar of another environment', async () => {
        const other = { ...PLACE, environmentId: 'prod' };
        const jar = await jars.jarOf({ root, ...other });

        await jar.setCookie('sid=zzz; Path=/', 'https://api.example.com/');
        await ipc.call(CHANNELS.cookiesClear, PLACE);

        const answer = await ipc.call(CHANNELS.cookiesList, other);

        expect(answer).toMatchObject({ ok: true, value: { cookies: [{ name: 'sid' }] } });
    });
});

describe('the handlers of the jar, undone', () => {
    it('stop answering when disposed', () => {
        dispose();

        expect(() => ipc.call(CHANNELS.cookiesList, PLACE)).toThrow();
    });
});
