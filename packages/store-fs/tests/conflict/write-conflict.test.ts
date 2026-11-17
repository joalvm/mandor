import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { conflictFile, conflictId, conflictsDir } from '../../src/conflict/conflict-path.js';
import { writeConflict } from '../../src/conflict/write-conflict.js';
import { recordOf } from './conflict-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const PATH = 'workspaces/pagos/collections/a.yaml';

describe('writing a conflict', () => {
    it('creates the folder and keeps the record under the id of its path', async () => {
        const id = await writeConflict(root, recordOf(PATH));
        const kept: unknown = JSON.parse(await readFile(conflictFile(root, id), 'utf8'));

        expect(id).toBe(conflictId(PATH));
        expect(kept).toEqual(recordOf(PATH));
    });

    it('replaces the record of the same file instead of adding a second one', async () => {
        await writeConflict(root, recordOf(PATH));
        const id = await writeConflict(root, recordOf(PATH, { theirs: 'a: 3\n' }));

        expect(await readdir(conflictsDir(root))).toEqual([`${id}.json`]);
        expect(JSON.parse(await readFile(conflictFile(root, id), 'utf8'))).toMatchObject({
            theirs: 'a: 3\n',
        });
    });

    it('refuses a path that leaves the repo', async () => {
        await expect(writeConflict(root, recordOf('../fuera.yaml'))).rejects.toThrow();
    });
});
