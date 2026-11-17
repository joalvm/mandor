import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { listConflicts } from '@mandor/store-fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { onConflictRecorded } from '../../src/repo/conflict-events.js';
import { forgetTexts, knownText } from '../../src/repo/known-texts.js';
import { mergeDivergence } from '../../src/sync/merge-divergence.js';
import { depsOf, ITEM, request, SEED, WORKSPACE } from './merge-fixtures.js';
import { diverged, removeMachines, machinesOf, type TwoMachines } from './two-machines.js';

let machines: TwoMachines;

const seeded = machinesOf(SEED);

afterEach(async () => {
    forgetTexts(machines.mine.root);
    vi.unstubAllEnvs();
    await removeMachines(machines);
});

describe('what a merge leaves around it (merge-divergence)', () => {
    it('keeps its own name for the repo without asking anybody, and says so in the log', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { 'mandor.yaml': 'name: Mine\n' },
            { 'mandor.yaml': 'name: Theirs\n' },
        );

        const { deps, warned } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 0 });
        expect(await readFile(join(machines.mine.root, 'mandor.yaml'), 'utf8')).toContain(
            'name: Mine',
        );
        expect(warned).toHaveLength(1);
        expect(warned[0]).toContain('mandor.yaml');
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);
    });

    it('tells the window what the merge brought and each clash it kept', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('PATCH', '/login') },
            {
                [ITEM]: request('PUT', '/login'),
                [WORKSPACE]: 'name: Cobros\n',
            },
        );

        const { deps, pushed } = depsOf();
        const recorded: string[] = [];
        const stop = onConflictRecorded((_root, path) => recorded.push(path));

        await mergeDivergence(machines.mine, deps);
        stop();

        // The clashed item stays as this side had it: only what the merge brought is pushed.
        expect(pushed).toEqual([[{ area: 'workspace', workspaceId: 'pagos' }]]);
        expect(recorded).toEqual([ITEM]);
        expect(knownText(machines.mine.root, WORKSPACE)).toBe('name: Cobros\n');
    });

    it('says nothing to the window when the merge changed nothing it shows', async () => {
        machines = await seeded();
        await diverged(machines, { 'notes.txt': 'mine\n' }, { 'other.txt': 'theirs\n' });

        const { deps, pushed } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 0 });
        expect(pushed).toEqual([]);
    });
});
