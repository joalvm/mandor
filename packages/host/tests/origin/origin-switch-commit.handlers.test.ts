import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS, type OpenedOrigin, type Result } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rememberOrigin } from '../../src/origin/origins.js';
import { writeInRepo } from '../../src/repo/write-in-repo.js';
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
const otherRepo = localOriginRepo('Otro');

let fixture: OriginHandlersFixture;
let otherRoot: string;

beforeEach(async () => {
    fixture = await setupOriginHandlers(localRepo);
    otherRoot = join(fixture.base, 'other');

    await otherRepo(otherRoot);
    await rememberOrigin(fixture.userData, {
        id: 'other',
        name: 'Other',
        kind: 'local',
        root: otherRoot,
    });
});

afterEach(async () => {
    await teardownOriginHandlers(fixture);
});

function switchTo(id: string): Promise<Result<OpenedOrigin>> {
    return fixture.ipc.call(CHANNELS.originSwitch, { id }) as Promise<Result<OpenedOrigin>>;
}

describe('switching away from an origin with an edit waiting for its calm', () => {
    it('commits the edit in the origin it was made in, before the window looks away', async () => {
        await switchTo('local');
        await writeFile(join(fixture.localRoot, 'note.txt'), 'hello\n', 'utf8');
        await writeInRepo(
            {
                root: fixture.localRoot,
                path: 'note.txt',
                change: { kind: 'update-item', name: 'note' },
            },
            () => Promise.resolve(),
        );

        await expect(switchTo('other')).resolves.toMatchObject({ ok: true });

        await expect(lastSubject(fixture.localRoot)).resolves.toBe('update item note');
        await expect(dirtyFiles(fixture.localRoot)).resolves.toEqual([]);
    });
});
