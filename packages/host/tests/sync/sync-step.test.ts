import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { commitAll } from '@mandor/git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StoredOrigin } from '../../src/origin/stored-origin.js';
import { scheduleCommit } from '../../src/repo/commit-scheduler.js';
import { syncStep, type SyncStepDeps } from '../../src/sync/sync-step.js';
import { bareLog, type BareOrigin } from '../support/bare-origin.js';
import { machinesOf } from './two-machines.js';

let base: string;
let bare: BareOrigin;
let mine: StoredOrigin;
let yours: string;

const seeded = machinesOf({});

beforeEach(async () => {
    const machines = await seeded();

    base = machines.base;
    bare = machines.bare;
    mine = { id: 'team', kind: 'remote', name: 'Team', root: machines.mine.root, url: bare.url };
    yours = machines.theirs;
});

afterEach(async () => {
    await rm(base, { force: true, recursive: true });
    vi.unstubAllEnvs();
});

function depsOf(overrides: Partial<SyncStepDeps> = {}): SyncStepDeps & {
    followed: ReturnType<typeof vi.fn<(paths: string[]) => Promise<void>>>;
} {
    const followed = vi.fn<(paths: string[]) => Promise<void>>(() => Promise.resolve());

    return {
        access: () => Promise.resolve({ url: bare.url }),
        hasConflicts: () => Promise.resolve(false),
        migrate: () => Promise.resolve(),
        ...overrides,
        followed,
        mergeDeps: { push: vi.fn(), warn: vi.fn() },
    };
}

async function commit(root: string, name: string, text: string): Promise<void> {
    await writeFile(join(root, name), text, 'utf8');
    await commitAll(root, `update ${name}`);
}

describe('one step of the synchronization of an origin', () => {
    it('does nothing for the local origin: it has no remote', async () => {
        const deps = depsOf({
            access: () => Promise.reject(new Error('no remote to reach')),
        });

        await expect(
            syncStep({ name: 'Team', root: mine.root, kind: 'local' }, deps),
        ).resolves.toBe('local-only');
    });

    it('ends clean when the two sides hold the same', async () => {
        await expect(syncStep(mine, depsOf())).resolves.toBe('clean');
    });

    it('sends what was committed here, and the remote moves forward', async () => {
        await commit(mine.root, 'a.txt', 'a\n');

        await expect(syncStep(mine, depsOf())).resolves.toBe('clean');
        expect((await bareLog(bare))[0]).toBe('update a.txt');
    });

    it('commits what waits for its calm before looking, so what is sent is whole', async () => {
        await writeFile(join(mine.root, 'late.txt'), 'late\n', 'utf8');
        scheduleCommit(
            {
                root: mine.root,
                key: 'late',
                paths: ['late.txt'],
                change: { kind: 'update-item', name: 'late' },
            },
            3_600_000,
        );

        await expect(syncStep(mine, depsOf())).resolves.toBe('clean');
        expect((await bareLog(bare))[0]).toBe('update item late');
    });

    it('takes what the other side sent when it is only ahead, and says which paths moved', async () => {
        await commit(yours, 'b.txt', 'b\n');
        await syncStep({ ...mine, root: yours }, depsOf());

        const deps = depsOf();

        await expect(syncStep(mine, deps)).resolves.toBe('clean');
        expect(await readFile(join(mine.root, 'b.txt'), 'utf8')).toBe('b\n');
        expect(deps.followed).toHaveBeenCalledWith(['b.txt']);
    });

    it('migrates the format once what the other side sent is in, and only then', async () => {
        const migrate = vi.fn(() => Promise.resolve());

        await expect(syncStep(mine, depsOf({ migrate }))).resolves.toBe('clean');
        expect(migrate).not.toHaveBeenCalled();

        await commit(yours, 'b.txt', 'b\n');
        await syncStep({ ...mine, root: yours }, depsOf());
        await expect(syncStep(mine, depsOf({ migrate }))).resolves.toBe('clean');
        expect(migrate).toHaveBeenCalledTimes(1);
    });

    it('waits when the tree has something pending, and brings nothing over it', async () => {
        await commit(yours, 'b.txt', 'b\n');
        await syncStep({ ...mine, root: yours }, depsOf());
        await writeFile(join(mine.root, 'pending.txt'), 'not committed\n', 'utf8');

        const deps = depsOf();

        await expect(syncStep({ ...mine }, deps)).resolves.toBe('behind');
        expect(deps.followed).not.toHaveBeenCalled();
    });

    it('merges nothing over a tree with something pending, and sends nothing', async () => {
        await commit(yours, 'b.txt', 'b\n');
        await syncStep({ ...mine, root: yours }, depsOf());
        await commit(mine.root, 'a.txt', 'a\n');
        await writeFile(join(mine.root, 'pending.txt'), 'not committed\n', 'utf8');

        const before = await bareLog(bare);
        const deps = depsOf();

        await expect(syncStep(mine, deps)).resolves.toBe('diverged');
        expect(deps.mergeDeps.push).not.toHaveBeenCalled();
        expect(await readFile(join(mine.root, 'b.txt'), 'utf8').catch(() => null)).toBeNull();
        expect(await bareLog(bare)).toEqual(before);
    });

    it('stops at a clash kept for a person: nothing is sent and nothing is brought', async () => {
        await commit(mine.root, 'a.txt', 'a\n');

        const before = await bareLog(bare);
        const deps = depsOf({ hasConflicts: () => Promise.resolve(true) });

        await expect(syncStep(mine, deps)).resolves.toBe('conflict');
        expect(await bareLog(bare)).toEqual(before);
    });

    it('throws what git refused, for the loop to decide when to try again', async () => {
        await rm(bare.path, { force: true, recursive: true });

        await expect(syncStep(mine, depsOf())).rejects.toThrow();
    });
});
