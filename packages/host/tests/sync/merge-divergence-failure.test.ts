import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { listConflicts } from '@mandor/store-fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { forgetTexts } from '../../src/repo/known-texts.js';
import { mergeDivergence } from '../../src/sync/merge-divergence.js';
import {
    diverged,
    pending,
    removeMachines,
    twoMachines,
    type TwoMachines,
} from './two-machines.js';

// isolation-policy: the disk write of the real store is replaced for the whole file
const failure = vi.hoisted(() => ({ writes: 0 }));

vi.mock('@mandor/store-fs', async (importOriginal) => {
    const real = await importOriginal<{
        atomicWrite: (path: string, contents: string) => Promise<void>;
    }>();

    return {
        ...real,
        atomicWrite: async (path: string, contents: string) => {
            failure.writes += 1;

            if (failure.writes === 2) {
                throw new Error('disk full');
            }

            await real.atomicWrite(path, contents);
        },
    };
});

const FIRST = 'workspaces/pagos/docs/first.md';
const SECOND = 'workspaces/pagos/docs/second.md';

let machines: TwoMachines;

afterEach(async () => {
    forgetTexts(machines.mine.root);
    vi.unstubAllEnvs();
    await removeMachines(machines);
});

describe('a merge that cannot be written to disk (merge-divergence)', () => {
    it('takes everything back: no merge open, no record and the same tree as before', async () => {
        machines = await twoMachines({
            [FIRST]: 'one\ntwo\nthree\n',
            [SECOND]: 'one\ntwo\nthree\n',
        });
        await diverged(
            machines,
            { [FIRST]: 'ONE\ntwo\nthree\n', [SECOND]: 'ONE\ntwo\nthree\n' },
            { [FIRST]: 'Uno\ntwo\nthree\n', [SECOND]: 'Uno\ntwo\nthree\n' },
        );
        failure.writes = 0;

        await expect(
            mergeDivergence(machines.mine, { push: vi.fn(), warn: vi.fn() }),
        ).rejects.toThrow('disk full');

        expect(await pending(machines.mine.root)).toBe('');
        expect((await listConflicts(machines.mine.root)).conflicts).toEqual([]);
        expect(await readFile(join(machines.mine.root, FIRST), 'utf8')).toBe('ONE\ntwo\nthree\n');
    });
});
