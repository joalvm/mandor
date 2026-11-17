import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { initRepo as initGitRepo } from '@mandor/git';
import { CHANNELS, type OpenedOrigin, type Result } from '@mandor/ipc';
import type { Origin } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dirtyFiles, lastSubject } from '../support/repo-history.js';
import {
    localOriginRepo,
    setupOriginHandlers,
    teardownOriginHandlers,
    type OriginHandlersFixture,
} from './origin-handlers-fixture.js';

vi.mock('electron', async () => ({
    app: { getPath: () => '' },
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

const localRepo = localOriginRepo();

let fixture: OriginHandlersFixture;

beforeEach(async () => {
    fixture = await setupOriginHandlers(localRepo);
});

afterEach(async () => {
    await teardownOriginHandlers(fixture);
});

function add(payload: unknown): Promise<Result<Origin>> {
    return fixture.ipc.call(CHANNELS.originAdd, payload) as Promise<Result<Origin>>;
}

function empty(payload: unknown): Promise<Result<object>> {
    return fixture.ipc.call(CHANNELS.originEmpty, payload) as Promise<Result<object>>;
}

function list(): Promise<Result<Origin[]>> {
    return fixture.ipc.call(CHANNELS.originList) as Promise<Result<Origin[]>>;
}

function switchTo(payload: unknown): Promise<Result<OpenedOrigin>> {
    return fixture.ipc.call(CHANNELS.originSwitch, payload) as Promise<Result<OpenedOrigin>>;
}

describe('adding an origin from the renderer', () => {
    it('stores an origin whose url answers', async () => {
        const remote = join(fixture.base, 'answerable.git');

        await mkdir(remote);
        await initGitRepo(remote);

        const answer = await add({ name: 'Team', url: pathToFileURL(remote).toString() });

        expect(answer).toMatchObject({ ok: true, value: { name: 'Team', kind: 'remote' } });
        expect(answer.ok && answer.value).not.toHaveProperty('root');

        const known = await list();

        expect(known.ok && known.value.map((origin) => origin.id)).toEqual([
            'local',
            answer.ok ? answer.value.id : '',
        ]);
    });

    it('refuses an origin whose url answers nothing and does not store it', async () => {
        const missing = pathToFileURL(join(fixture.base, 'no-such.git')).toString();
        const answer = await add({ name: 'Ghost', url: missing });

        expect(answer).toMatchObject({ ok: false, error: { code: 'origin-unreachable' } });

        const known = await list();

        expect(known.ok && known.value.map((origin) => origin.id)).toEqual(['local']);
    });

    it('refuses a url that cannot name an origin', async () => {
        await expect(add({ name: 'Odd', url: 'not a url' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('emptying an origin from the renderer', () => {
    it('leaves the origin without workspaces and keeps it in the list', async () => {
        await expect(empty({ id: 'local' })).resolves.toEqual({ ok: true, value: {} });
        await expect(switchTo({ id: 'local' })).resolves.toMatchObject({
            ok: true,
            value: { workspaces: [] },
        });
        await expect(list()).resolves.toMatchObject({ ok: true, value: [{ id: 'local' }] });
    });

    it('commits the emptying in the act, with a clean tree behind it', async () => {
        await empty({ id: 'local' });

        await expect(lastSubject(fixture.localRoot)).resolves.toBe('empty repo');
        await expect(dirtyFiles(fixture.localRoot)).resolves.toEqual([]);
    });

    it('refuses an origin the machine does not know', async () => {
        await expect(empty({ id: 'nowhere' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
