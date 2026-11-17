import { mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readConflictFile } from '../../src/conflict/read-conflict.js';
import { MAX_FILE_BYTES } from '../../src/disk/read-file-text.js';
import { recordOf } from './conflict-fixture.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('reading a conflict file', () => {
    it('returns the record', async () => {
        const file = join(dir, 'a.json');

        await writeFile(file, JSON.stringify(recordOf('a.yaml')), 'utf8');

        expect(await readConflictFile(file)).toEqual({ ok: true, record: recordOf('a.yaml') });
    });

    it.each(['{ roto', '{"path":"a.yaml"}'])('turns `%s` into a warning', async (contents) => {
        const file = join(dir, 'b.json');

        await writeFile(file, contents, 'utf8');

        const read = await readConflictFile(file);

        expect(read.ok).toBe(false);
        expect(read).toMatchObject({ warning: { path: file } });
    });

    it('turns a file past the cap into a warning', async () => {
        const file = join(dir, 'c.json');

        await writeFile(file, JSON.stringify(recordOf('a.yaml')), 'utf8');
        await truncate(file, MAX_FILE_BYTES + 1);

        const read = await readConflictFile(file);

        expect(read).toMatchObject({ ok: false, warning: { path: file } });
        expect(read.ok ? '' : read.warning.message).toMatch(/64 MiB/);
    });

    it('turns a file that is not there into a warning', async () => {
        expect((await readConflictFile(join(dir, 'nada.json'))).ok).toBe(false);
    });
});
