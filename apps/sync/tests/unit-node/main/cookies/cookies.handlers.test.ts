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
    it('changes the value of a cookie and keeps the rest of it', async () => {
        await expect(ipc.call(CHANNELS.cookiesSet, { ...SID, value: 'new' })).resolves.toEqual({
            ok: true,
            value: {},
        });

        const jar = await jars.jarOf({ root, ...PLACE });
        const [cookie] = await jar.getCookies('https://api.example.com/');

        expect(cookie).toMatchObject({ key: 'sid', value: 'new', httpOnly: true, secure: true });
    });

    it('keeps the change on disk', async () => {
        await ipc.call(CHANNELS.cookiesSet, { ...SID, value: 'new' });

        const reread = createCookieJarStore();
        const jar = await reread.jarOf({ root, ...PLACE });

        expect((await jar.getCookies('https://api.example.com/')).map((c) => c.value)).toEqual([
            'new',
        ]);
    });

    it('refuses to set a cookie the jar does not hold', async () => {
        await expect(
            ipc.call(CHANNELS.cookiesSet, { ...SID, name: 'ghost', value: 'x' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it.each(['a;b', 'line\nbreak'])(
        'refuses a value that could split the header: %j',
        async (value) => {
            await expect(ipc.call(CHANNELS.cookiesSet, { ...SID, value })).resolves.toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
        },
    );

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
