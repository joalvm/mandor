import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { initRepo as initGitRepo } from '@mandor/git';
import { CHANNELS, type OriginCheck, type Result } from '@mandor/ipc';
import type { Origin } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activeOriginRoot, setActiveOrigin } from '../../src/origin/active-origin.js';
import { openOriginRuntime } from '../../src/origin/origin-runtime.js';
import { rememberOrigin } from '../../src/origin/origins.js';
import type { StoredOrigin } from '../../src/origin/stored-origin.js';
import { silentReporting } from '../../src/testing/handler-harness.js';

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

function teamOrigin(url: string): StoredOrigin {
    return { id: 'team', kind: 'remote', name: 'Team', root: join(fixture.base, 'team'), url };
}

function check(payload: unknown): Promise<Result<OriginCheck>> {
    return fixture.ipc.call(CHANNELS.originCheck, payload) as Promise<Result<OriginCheck>>;
}

function remove(payload: unknown): Promise<Result<object>> {
    return fixture.ipc.call(CHANNELS.originRemove, payload) as Promise<Result<object>>;
}

function rename(payload: unknown): Promise<Result<Origin>> {
    return fixture.ipc.call(CHANNELS.originRename, payload) as Promise<Result<Origin>>;
}

function list(): Promise<Result<Origin[]>> {
    return fixture.ipc.call(CHANNELS.originList) as Promise<Result<Origin[]>>;
}

describe('checking an origin from the renderer', () => {
    it('answers reachable when the url still reaches its refs', async () => {
        const remote = join(fixture.base, 'answerable.git');

        await mkdir(remote);
        await initGitRepo(remote);

        const url = pathToFileURL(remote).toString();
        const stored = teamOrigin(url);

        await rememberOrigin(fixture.userData, stored);
        await mkdir(stored.root);

        await expect(check({ id: 'team' })).resolves.toEqual({
            ok: true,
            value: { id: 'team', reachable: true },
        });
    });

    it('answers unreachable as an answer, not a failure', async () => {
        const missing = pathToFileURL(join(fixture.base, 'no-such.git')).toString();

        await rememberOrigin(fixture.userData, teamOrigin(missing));

        await expect(check({ id: 'team' })).resolves.toEqual({
            ok: true,
            value: { id: 'team', reachable: false },
        });
    });

    it('answers reachable for the local origin without asking anything', async () => {
        await expect(check({ id: 'local' })).resolves.toEqual({
            ok: true,
            value: { id: 'local', reachable: true },
        });
    });
});

describe('removing an origin from the renderer', () => {
    it('takes the origin off the list and its copy off this machine', async () => {
        const stored = teamOrigin('https://github.com/org/team.git');

        await rememberOrigin(fixture.userData, stored);
        await mkdir(stored.root, { recursive: true });

        await expect(remove({ id: 'team' })).resolves.toEqual({ ok: true, value: {} });

        expect(await fixture.exists('team')).toBe(false);
        await expect(list()).resolves.toMatchObject({ ok: true, value: [{ id: 'local' }] });
    });

    it('leaves the origin first when the window is working in it', async () => {
        const stored = teamOrigin('https://github.com/org/team.git');

        await rememberOrigin(fixture.userData, stored);
        await mkdir(stored.root, { recursive: true });
        setActiveOrigin(stored);
        openOriginRuntime(stored, silentReporting().logger);

        await expect(remove({ id: 'team' })).resolves.toEqual({ ok: true, value: {} });

        expect(activeOriginRoot()).toBeNull();
        expect(await fixture.exists('team')).toBe(false);
    });

    /** The local origin is the ground the app stands on; it is never the renderer's to remove. */
    it('refuses to remove the local origin', async () => {
        await expect(remove({ id: 'local' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('refuses an origin the machine does not know', async () => {
        await expect(remove({ id: 'ghost' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('renaming an origin from the renderer', () => {
    it('moves the name and keeps id, kind and url', async () => {
        await rememberOrigin(fixture.userData, teamOrigin('https://github.com/org/team.git'));

        await expect(rename({ id: 'team', name: 'Equipo' })).resolves.toEqual({
            ok: true,
            value: {
                id: 'team',
                kind: 'remote',
                name: 'Equipo',
                url: 'https://github.com/org/team.git',
            },
        });
    });

    it('refuses an empty name', async () => {
        await expect(rename({ id: 'team', name: '  ' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
