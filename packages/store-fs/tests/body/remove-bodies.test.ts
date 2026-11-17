import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodiesDir } from '../../src/body/body-path.js';
import { removeBodies } from '../../src/body/remove-bodies.js';

const REF_A = 'a'.repeat(64);
const REF_B = 'b'.repeat(64);

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('removing stored bodies', () => {
    it('deletes the named files and leaves the others', async () => {
        await mkdir(bodiesDir(root), { recursive: true });
        await writeFile(join(bodiesDir(root), REF_A), 'a');
        await writeFile(join(bodiesDir(root), REF_B), 'b');

        await removeBodies(root, [REF_A]);

        expect(await readdir(bodiesDir(root))).toEqual([REF_B]);
    });

    it('does not complain about a body that is already gone', async () => {
        await expect(removeBodies(root, [REF_A])).resolves.toBeUndefined();
    });

    it('refuses a name that is not a sha-256', async () => {
        await expect(removeBodies(root, ['../x'])).rejects.toThrow();
    });
});
