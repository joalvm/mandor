import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { conflictId, listConflicts } from '@mandor/store-fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConflictOpenError } from '../../src/conflict/conflict-open-error.js';
import { keepMine, resolveConflict } from '../../src/conflict/resolve-conflict.js';
import { onConflictsChanged } from '../../src/repo/conflict-events.js';
import { forgetTexts } from '../../src/repo/known-texts.js';
import { mergeDivergence } from '../../src/sync/merge-divergence.js';
import { stepDepsOf } from '../../src/sync/step-deps.js';
import { syncStep } from '../../src/sync/sync-step.js';
import { bareLog } from '../support/bare-origin.js';
import { depsOf, ITEM, SEED } from '../sync/merge-fixtures.js';
import {
    diverged,
    pending,
    removeMachines,
    machinesOf,
    type TwoMachines,
} from '../sync/two-machines.js';
import { clashedRequest } from './clashed-request.js';

const requestSync = vi.hoisted(() => vi.fn());

vi.mock('../../src/origin/origin-runtime.js', () => ({ requestSync }));

let machines: TwoMachines;

// Every test starts from the same two edits; only the merge, which leaves state in memory for
// the copy it ran on, is done per test.
const seeded = machinesOf({ ...SEED, [ITEM]: clashedRequest({}) }, (built) =>
    diverged(
        built,
        { [ITEM]: clashedRequest({ accept: 'text/html', user: 'ana' }) },
        { [ITEM]: clashedRequest({ accept: 'text/csv', user: 'bea' }) },
    ),
);

afterEach(async () => {
    forgetTexts(machines.mine.root);
    vi.unstubAllEnvs();
    requestSync.mockClear();
    await removeMachines(machines);
});

/** Two copies that changed the same header and the same body; this one is merged and waits. */
async function clashed(): Promise<string> {
    machines = await seeded();
    await mergeDivergence(machines.mine, depsOf().deps);

    return conflictId(ITEM);
}

async function textOf(path: string): Promise<string> {
    return readFile(join(machines.mine.root, path), 'utf8');
}

function stepOf(): ReturnType<typeof syncStep> {
    const origin = { ...machines.mine, kind: 'remote' as const };
    const deps = stepDepsOf(origin, () => Promise.resolve({ url: machines.bare.url }), vi.fn());

    return syncStep(origin, deps);
}

const ANSWERS = {
    'headers/Accept#1': { pick: 'theirs' },
    'body/content': { text: '{ "user": "both" }\n' },
} as const;

describe('resolving a clash with the answers of a person (resolve-conflict)', () => {
    it('writes the answers, drops the record, commits in the act and lets the sync go on', async () => {
        const id = await clashed();
        const changed: string[] = [];
        const stop = onConflictsChanged((where) => changed.push(where));

        await resolveConflict(machines.mine.root, id, ANSWERS);
        stop();

        expect(await textOf(ITEM)).toContain('value: text/csv');
        expect(await textOf(ITEM)).toContain('{ "user": "both" }');
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);
        expect(await pending(machines.mine.root)).toBe('');
        expect(changed).toEqual([machines.mine.root]);
        expect(requestSync).toHaveBeenCalledTimes(1);
    });

    it('sends the merge and the resolution once the step runs again', async () => {
        const id = await clashed();

        await expect(stepOf()).resolves.toBe('conflict');
        await resolveConflict(machines.mine.root, id, ANSWERS);
        await expect(stepOf()).resolves.toBe('clean');

        expect((await bareLog(machines.bare)).slice(0, 2)).toEqual([
            'resolve conflict in Login',
            'merge changes of Team',
        ]);
    });

    it('refuses while a question has no answer, and changes nothing', async () => {
        const id = await clashed();
        const before = await textOf(ITEM);

        await expect(
            resolveConflict(machines.mine.root, id, { 'headers/Accept#1': { pick: 'theirs' } }),
        ).rejects.toBeInstanceOf(ConflictOpenError);

        expect(await textOf(ITEM)).toBe(before);
        expect((await listConflicts(machines.mine.root)).conflicts).toHaveLength(1);
        expect(await pending(machines.mine.root)).toBe('');
        expect(requestSync).not.toHaveBeenCalled();
    });

    it('refuses an id the repo keeps no clash of', async () => {
        await clashed();

        await expect(resolveConflict(machines.mine.root, 'nothing', {})).rejects.toThrow();
    });

    /** Read as gone, a file that cannot be read now would be written over or deleted. */
    it('refuses while the file cannot be read, and changes nothing', async () => {
        const id = await clashed();
        const file = join(machines.mine.root, ITEM);

        await rm(file);
        await mkdir(file);

        await expect(resolveConflict(machines.mine.root, id, ANSWERS)).rejects.toMatchObject({
            code: 'EISDIR',
        });
        expect((await listConflicts(machines.mine.root)).conflicts).toHaveLength(1);
        expect((await stat(file)).isDirectory()).toBe(true);
        expect(requestSync).not.toHaveBeenCalled();
    });

    it('refuses a clash that was already resolved', async () => {
        const id = await clashed();

        await resolveConflict(machines.mine.root, id, ANSWERS);

        await expect(resolveConflict(machines.mine.root, id, ANSWERS)).rejects.toThrow();
    });

    it('only drops the record of a clash whose questions were answered by hand', async () => {
        const id = await clashed();
        const theirs = clashedRequest({ accept: 'text/csv', user: 'bea' });

        await writeFile(join(machines.mine.root, ITEM), theirs, 'utf8');
        await resolveConflict(machines.mine.root, id, {});

        expect(await textOf(ITEM)).toBe(theirs);
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);
        expect(requestSync).toHaveBeenCalledTimes(1);
    });
});

describe('keeping this copy as it is (keep-mine)', () => {
    it('leaves the file, drops the record and lets the sync go on', async () => {
        const id = await clashed();
        const before = await textOf(ITEM);

        await keepMine(machines.mine.root, id);

        expect(await textOf(ITEM)).toBe(before);
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);
        expect(requestSync).toHaveBeenCalledTimes(1);
    });

    it('sends the merge once the clash is closed', async () => {
        const id = await clashed();

        await expect(stepOf()).resolves.toBe('conflict');
        await keepMine(machines.mine.root, id);
        await expect(stepOf()).resolves.toBe('clean');

        expect((await bareLog(machines.bare))[0]).toBe('merge changes of Team');
    });

    it('refuses an id the repo keeps no clash of', async () => {
        await clashed();

        await expect(keepMine(machines.mine.root, 'nothing')).rejects.toThrow();
    });
});
