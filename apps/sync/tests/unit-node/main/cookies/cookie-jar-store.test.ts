import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { cookieJarFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCookieJarStore } from '../../../../src/main/cookies/cookie-jar-store.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-jar-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const STAGING = { workspaceId: 'pagos', environmentId: 'staging' };

describe('the cookie jars of the app', () => {
    it('starts empty where nothing was ever kept', async () => {
        const jar = await createCookieJarStore().jarOf({ root, ...STAGING });

        await expect(jar.getCookies('https://a.test/')).resolves.toEqual([]);
    });

    it('gives the same jar to every send of one environment, and another to another', async () => {
        const store = createCookieJarStore();
        const first = await store.jarOf({ root, ...STAGING });

        expect(await store.jarOf({ root, ...STAGING })).toBe(first);
        expect(await store.jarOf({ root, workspaceId: 'pagos', environmentId: null })).not.toBe(
            first,
        );
    });

    it('keeps the jar on disk after a send that changed it, and a new run reads it back', async () => {
        const place = { root, ...STAGING };
        const first = await createCookieJarStore().session(place);

        await first.port.store('https://a.test/login', ['sid=abc; Path=/']);
        await first.finish();

        const again = await createCookieJarStore().session(place);

        await expect(again.port.header('https://a.test/me')).resolves.toBe('sid=abc');
    });

    it('writes nothing after a send that changed nothing', async () => {
        const session = await createCookieJarStore().session({ root, ...STAGING });

        await session.port.store('https://a.test/', []);
        await session.finish();

        await expect(stat(cookieJarFile(root, 'pagos', 'staging'))).rejects.toThrow();
    });

    it('writes the jar as the library serializes it', async () => {
        const place = { root, ...STAGING };
        const store = createCookieJarStore();

        await (await store.session(place)).port.store('https://a.test/', ['sid=abc']);
        await store.save(place);

        const kept: unknown = JSON.parse(
            await readFile(cookieJarFile(root, 'pagos', 'staging'), 'utf8'),
        );

        expect(kept).toHaveProperty('cookies');
    });

    /**
     * Sends that end together each save the one jar they share. Each save has to write after the
     * one before it, with what the jar holds by then: otherwise an older copy can land last, and
     * the next run reads a jar that lost what the later answers set.
     */
    it('leaves on disk the jar as the last of many overlapping saves found it', async () => {
        const place = { root, ...STAGING };
        const store = createCookieJarStore();
        const jar = await store.jarOf(place);
        const saves: Promise<void>[] = [];

        for (let index = 0; index < 20; index += 1) {
            await jar.setCookie(`c${String(index)}=v`, 'https://a.test/');
            saves.push(store.save(place));
        }

        await Promise.all(saves);

        const kept = await createCookieJarStore().jarOf(place);

        await expect(kept.getCookies('https://a.test/')).resolves.toHaveLength(20);
    });

    it('treats a file that is not a jar as an empty one', async () => {
        const place = { root, ...STAGING };
        const store = createCookieJarStore();

        await (await store.session(place)).port.store('https://a.test/', ['sid=abc']);
        await store.save(place);
        await writeFile(cookieJarFile(root, 'pagos', 'staging'), '{not json');

        const jar = await createCookieJarStore().jarOf(place);

        await expect(jar.getCookies('https://a.test/')).resolves.toEqual([]);
    });

    /**
     * A jar locked for a moment is not an empty one. Read as empty and kept, the next answer
     * that set a cookie would write it over every cookie the file held.
     */
    it('lends an empty jar while the file cannot be read, and writes nothing over it', async () => {
        const place = { root, ...STAGING };
        const file = cookieJarFile(root, 'pagos', 'staging');
        const store = createCookieJarStore();

        await mkdir(file, { recursive: true });

        const session = await store.session(place);

        await session.port.store('https://a.test/', ['sid=abc']);
        await session.finish();

        expect((await stat(file)).isDirectory()).toBe(true);
        expect(await store.jarOf(place)).not.toBe(await store.jarOf(place));
    });

    it('reads the file again once it can be read', async () => {
        const place = { root, ...STAGING };
        const file = cookieJarFile(root, 'pagos', 'staging');
        const store = createCookieJarStore();
        const kept = createCookieJarStore();

        await (await kept.session(place)).port.store('https://a.test/', ['sid=abc']);
        await kept.save(place);

        const text = await readFile(file, 'utf8');

        await rm(file);
        await mkdir(file);
        await store.jarOf(place);
        await rm(file, { recursive: true });
        await writeFile(file, text, 'utf8');

        await expect(
            store.session(place).then((each) => each.port.header('https://a.test/')),
        ).resolves.toBe('sid=abc');
    });

    it('refuses an environment that could walk out of the folder', () => {
        expect(() =>
            createCookieJarStore().jarOf({ root, workspaceId: 'pagos', environmentId: '../x' }),
        ).toThrow();
    });
});
