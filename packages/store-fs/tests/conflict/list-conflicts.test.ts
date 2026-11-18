import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { conflictFile, conflictsDir } from '../../src/conflict/conflict-path.js';
import { listConflicts } from '../../src/conflict/list-conflicts.js';
import { writeConflict } from '../../src/conflict/write-conflict.js';
import { recordOf } from './conflict-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('listing the conflicts', () => {
    it('returns nothing when nothing ever clashed', async () => {
        expect(await listConflicts(root)).toEqual({ conflicts: [], warnings: [] });
    });

    it('returns every record with its id', async () => {
        const first = await writeConflict(root, recordOf('a.yaml'));
        const second = await writeConflict(root, recordOf('b.yaml', { source: 'merge' }));
        const listed = await listConflicts(root);

        expect(listed.conflicts.map(({ id }) => id)).toEqual([first, second].sort());
        expect(listed.conflicts.map(({ record }) => record.path).sort()).toEqual([
            'a.yaml',
            'b.yaml',
        ]);
    });

    it('turns a file that does not parse into a warning and keeps going', async () => {
        const id = await writeConflict(root, recordOf('a.yaml'));

        await writeFile(conflictFile(root, '0123456789abcdef'), '{ roto', 'utf8');
        await writeFile(join(conflictsDir(root), 'notes.txt'), 'x', 'utf8');

        const listed = await listConflicts(root);

        expect(listed.conflicts.map((each) => each.id)).toEqual([id]);
        expect(listed.warnings).toHaveLength(1);
    });

    it('ignores a folder that does not exist yet', async () => {
        await mkdir(root, { recursive: true });

        expect((await listConflicts(root)).conflicts).toEqual([]);
    });
});
