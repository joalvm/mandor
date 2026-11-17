import { join } from 'node:path';

import { CHANNELS, type OpenedOrigin, type Result } from '@mandor/ipc';
import { type Origin, REPO_FORMAT } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rememberOrigin } from '../../src/origin/origins.js';
import { activeOriginRoot } from '../../src/origin/active-origin.js';
import type { StoredOrigin } from '../../src/origin/stored-origin.js';

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

/** The first workspace is named by main, not by the fixture: its id is minted. */
const MINTED = /^[0-9a-hjkmnp-tv-z]{12}$/;

const localRepo = localOriginRepo();

let fixture: OriginHandlersFixture;

function teamOrigin(): StoredOrigin {
    return {
        id: 'team',
        kind: 'remote',
        name: 'Team',
        root: join(fixture.base, 'team'),
        url: 'https://github.com/org/team.git',
    };
}

beforeEach(async () => {
    fixture = await setupOriginHandlers(localRepo);
});

afterEach(async () => {
    await teardownOriginHandlers(fixture);
});

function list(): Promise<Result<Origin[]>> {
    return fixture.ipc.call(CHANNELS.originList) as Promise<Result<Origin[]>>;
}

function switchTo(payload: unknown): Promise<Result<OpenedOrigin>> {
    return fixture.ipc.call(CHANNELS.originSwitch, payload) as Promise<Result<OpenedOrigin>>;
}

describe('listing the origins from the renderer', () => {
    it('answers with the local origin first', async () => {
        await rememberOrigin(fixture.userData, teamOrigin());

        await expect(list()).resolves.toEqual({
            ok: true,
            value: [
                { id: 'local', kind: 'local', name: 'Local' },
                {
                    id: 'team',
                    kind: 'remote',
                    name: 'Team',
                    url: 'https://github.com/org/team.git',
                },
            ],
        });
    });

    /** The root of an origin is a path of this machine, and paths never cross the bridge. */
    it('never hands a root to the renderer', async () => {
        const answer = await list();

        expect(answer.ok && answer.value[0]).not.toHaveProperty('root');
    });
});

describe('switching the origin from the renderer', () => {
    it('opens the origin, fixes it as active and answers with what it holds', async () => {
        await expect(switchTo({ id: 'local' })).resolves.toEqual({
            ok: true,
            value: {
                repo: {
                    formatVersion: REPO_FORMAT,
                    name: 'Mandor',
                    workspaces: [expect.stringMatching(MINTED) as string],
                },
                workspaces: [
                    {
                        id: expect.stringMatching(MINTED) as string,
                        kind: 'async',
                        name: 'Personal',
                        modifiedAt: expect.any(String) as string,
                    },
                ],
            },
        });
        expect(activeOriginRoot()).toBe(fixture.localRoot);
    });

    it('refuses an origin the machine does not know', async () => {
        await expect(switchTo({ id: 'nowhere' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
        expect(activeOriginRoot()).toBeNull();
    });

    it('refuses a payload that does not match the schema of its channel', async () => {
        await expect(switchTo({ id: '../escape' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('the state of the open origin from the renderer', () => {
    it('is nothing while no origin is open', async () => {
        await expect(fixture.ipc.call(CHANNELS.originState)).resolves.toEqual({
            ok: true,
            value: null,
        });
    });

    it('is where the open origin stands against its remote', async () => {
        await switchTo({ id: 'local' });

        await expect(fixture.ipc.call(CHANNELS.originState)).resolves.toEqual({
            ok: true,
            value: { state: 'local-only', busy: false },
        });
    });
});

describe('the disposer of the origin handlers', () => {
    it('leaves no channel registered', () => {
        expect(fixture.ipc.registered()).toEqual([
            CHANNELS.originAdd,
            CHANNELS.originCheck,
            CHANNELS.originEmpty,
            CHANNELS.originList,
            CHANNELS.originRemove,
            CHANNELS.originRename,
            CHANNELS.originState,
            CHANNELS.originSwitch,
        ]);

        fixture.dispose();

        expect(fixture.ipc.registered()).toEqual([]);
    });
});
