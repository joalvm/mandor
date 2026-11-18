import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listConflicts } from '../../src/conflict/list-conflicts.js';
import { removeConflict } from '../../src/conflict/remove-conflict.js';
import { writeConflict } from '../../src/conflict/write-conflict.js';
import { recordOf } from './conflict-fixture.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('removing a conflict', () => {
    it('deletes the record of the id and leaves the rest', async () => {
        const first = await writeConflict(root, recordOf('a.yaml'));
        const second = await writeConflict(root, recordOf('b.yaml'));

        await removeConflict(root, first);

        expect((await listConflicts(root)).conflicts.map(({ id }) => id)).toEqual([second]);
    });

    it('does not complain about an id already gone', async () => {
        await expect(removeConflict(root, '0123456789abcdef')).resolves.toBeUndefined();
    });
});
