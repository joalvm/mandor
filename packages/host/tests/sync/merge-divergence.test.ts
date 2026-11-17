import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { listConflicts } from '@mandor/store-fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { forgetTexts } from '../../src/repo/known-texts.js';
import { mergeDivergence } from '../../src/sync/merge-divergence.js';
import { depsOf, ITEM, NOTES, request, SEED } from './merge-fixtures.js';
import {
    diverged,
    parentsOfHead,
    pending,
    removeMachines,
    machinesOf,
    type TwoMachines,
} from './two-machines.js';

let machines: TwoMachines;

const seeded = machinesOf(SEED);

afterEach(async () => {
    forgetTexts(machines.mine.root);
    vi.unstubAllEnvs();
    await removeMachines(machines);
});

async function textOf(path: string): Promise<string> {
    return readFile(join(machines.mine.root, path), 'utf8');
}

describe('closing a divergence with a merge (merge-divergence)', () => {
    it('joins what git cannot and the merge can, and asks nobody', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('POST', '/sign-in') },
            { [ITEM]: request('PUT', '/login') },
        );

        const { deps } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 0 });
        expect(await textOf(ITEM)).toBe(request('PUT', '/sign-in'));
        expect(await parentsOfHead(machines.mine.root)).toBe(2);
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);
        expect(await pending(machines.mine.root)).toBe('');
    });

    it('keeps this side where both changed the same field, and records the question', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('PATCH', '/login') },
            { [ITEM]: request('PUT', '/login') },
        );

        const { deps } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 1 });

        const { conflicts } = await listConflicts(machines.mine.root);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]?.record).toMatchObject({
            path: ITEM,
            source: 'merge',
            base: request('POST', '/login'),
            theirs: request('PUT', '/login'),
        });
        expect(await textOf(ITEM)).toBe(request('PATCH', '/login'));
        expect(await parentsOfHead(machines.mine.root)).toBe(2);
        expect(await pending(machines.mine.root)).toBe('');
    });

    it('records a doc that both sides wrote on the same line', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [NOTES]: 'ONE\ntwo\nthree\n' },
            { [NOTES]: 'Uno\ntwo\nthree\n' },
        );

        const { deps } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 1 });
        expect((await listConflicts(machines.mine.root)).conflicts[0]?.record.path).toBe(NOTES);
        expect(await textOf(NOTES)).toContain('ONE');
    });

    it('records a file that arrives broken as one question about the whole file', async () => {
        machines = await seeded();
        await diverged(
            machines,
            { [ITEM]: request('PATCH', '/login') },
            { [ITEM]: 'name: [Login\nmethod: PUT\n' },
        );

        const { deps } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 1 });
        expect(await textOf(ITEM)).toBe(request('PATCH', '/login'));
    });

    it('deletes a file this side deleted against a change, and keeps the question', async () => {
        machines = await seeded();
        await diverged(machines, { [NOTES]: null }, { [NOTES]: 'one\ntwo\nTHREE\n' });

        const { deps } = depsOf();

        await expect(mergeDivergence(machines.mine, deps)).resolves.toEqual({ records: 1 });
        await expect(textOf(NOTES)).rejects.toThrow();
        expect((await listConflicts(machines.mine.root)).conflicts[0]?.record.theirs).toBe(
            'one\ntwo\nTHREE\n',
        );
    });
});
