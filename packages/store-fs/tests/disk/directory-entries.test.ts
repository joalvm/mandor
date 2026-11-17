import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { entriesOrNone, namesOrNone } from '../../src/disk/directory-entries.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('reading the entries of a folder', () => {
    it('answers with the names the folder holds', async () => {
        await writeFile(join(dir, 'a.yaml'), 'a\n', 'utf8');

        await expect(namesOrNone(dir)).resolves.toEqual(['a.yaml']);
    });

    /** Nothing was written there yet: the folder is made by the first write. */
    it('answers with none when the folder does not exist yet', async () => {
        await expect(entriesOrNone(join(dir, 'docs'))).resolves.toEqual([]);
    });

    /** A folder that could not be read is not an empty one: a new name picked against it could collide. */
    it('throws when a file stands where the folder should be', async () => {
        await writeFile(join(dir, 'docs'), 'not a folder\n', 'utf8');

        await expect(namesOrNone(join(dir, 'docs'))).rejects.toMatchObject({ code: 'ENOTDIR' });
    });
});
