import { pushBranch } from '@mandor/git';
import { conflictId, listConflicts, removeConflict } from '@mandor/store-fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { forgetTexts } from '../../src/repo/known-texts.js';
import { stepDepsOf } from '../../src/sync/step-deps.js';
import { syncStep } from '../../src/sync/sync-step.js';
import { bareLog } from '../support/bare-origin.js';
import { ITEM, request, SEED } from './merge-fixtures.js';
import { diverged, removeMachines, machinesOf, write, type TwoMachines } from './two-machines.js';

let machines: TwoMachines;

const seeded = machinesOf(SEED);

afterEach(async () => {
    forgetTexts(machines.mine.root);
    vi.unstubAllEnvs();
    await removeMachines(machines);
});

function stepOf(): ReturnType<typeof syncStep> {
    const origin = { ...machines.mine, kind: 'remote' as const };
    const deps = stepDepsOf(origin, () => Promise.resolve({ url: machines.bare.url }), vi.fn());

    return syncStep(origin, deps);
}

describe('a step that finds both sides ahead (sync-step)', () => {
    it('merges what joins, sends the merge and ends clean', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('POST', '/sign-in') },
            { [ITEM]: request('PUT', '/login') },
        );

        await expect(stepOf()).resolves.toBe('clean');
        expect((await bareLog(machines.bare))[0]).toBe('merge changes of Team');
    });

    it('keeps the merge here while a clash waits for a person, then sends it once answered', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('PATCH', '/login') },
            { [ITEM]: request('PUT', '/login') },
        );

        const before = await bareLog(machines.bare);

        await expect(stepOf()).resolves.toBe('conflict');
        expect(await bareLog(machines.bare)).toEqual(before);

        // The answer of the person, as the tab of the clash will give it.
        await removeConflict(machines.mine.root, conflictId(ITEM));
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);

        await expect(stepOf()).resolves.toBe('clean');
        expect((await bareLog(machines.bare))[0]).toBe('merge changes of Team');
    });

    it('brings nothing more while the clash waits, even if the remote moves again', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('PATCH', '/login') },
            { [ITEM]: request('PUT', '/login') },
        );
        await stepOf();

        await write(machines.theirs, { 'notes.txt': 'again\n' }, 'again');
        await pushBranch(machines.theirs, { url: machines.bare.url });

        await expect(stepOf()).resolves.toBe('conflict');
        expect((await bareLog(machines.bare))[0]).toBe('again');
    });
});
