import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { yamlIdsIn } from '../../src/disk/yaml-ids-in.js';

let directory: string;

beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mandor-ids-'));
});

afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
});

describe('the ids a directory of YAML files already holds', () => {
    it('reads them from the file names, sorted, and leaves out what is not a YAML id', async () => {
        await writeFile(join(directory, 'zeta.yaml'), '');
        await writeFile(join(directory, 'alfa.yaml'), '');
        await writeFile(join(directory, 'notes.txt'), '');
        await writeFile(join(directory, 'Not An Id.yaml'), '');

        await expect(yamlIdsIn(directory)).resolves.toEqual(['alfa', 'zeta']);
    });

    it('counts a file the parser would reject, since its name is taken all the same', async () => {
        await writeFile(join(directory, 'roto.yaml'), ': : not yaml');

        await expect(yamlIdsIn(directory)).resolves.toEqual(['roto']);
    });

    it('holds none in a directory that does not exist yet', async () => {
        await expect(yamlIdsIn(join(directory, 'ausente'))).resolves.toEqual([]);
    });

    /** Taken for empty, it would let a new entity be named after a file that is there. */
    it('fails on a directory it cannot read instead of holding none', async () => {
        await writeFile(join(directory, 'connections'), 'not a folder\n');

        await expect(yamlIdsIn(join(directory, 'connections'))).rejects.toMatchObject({
            code: 'ENOTDIR',
        });
    });
});
