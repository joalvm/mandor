import { mkdir, mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MAX_FILE_BYTES } from '../../src/disk/read-file-text.js';
import { readTextOrNull } from '../../src/disk/read-text.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reading a text that may not be there', () => {
    it('returns the text as it sits on disk', async () => {
        await writeFile(join(root, 'a.yaml'), 'a: 1\r\n', 'utf8');

        expect(await readTextOrNull(join(root, 'a.yaml'))).toBe('a: 1\r\n');
    });

    it('returns null for a file that does not exist', async () => {
        expect(await readTextOrNull(join(root, 'nada.yaml'))).toBeNull();
        expect(await readTextOrNull(join(root, 'no', 'hay', 'a.yaml'))).toBeNull();
    });

    it('lets a failure that is not «missing» through', async () => {
        await mkdir(join(root, 'carpeta'));

        await expect(readTextOrNull(join(root, 'carpeta'))).rejects.toThrow();
    });

    /** Too large to read is not «not there»: a merge must not take it for an empty file. */
    it('lets a file past the cap through as a failure, not as missing', async () => {
        const path = join(root, 'a.yaml');

        await writeFile(path, 'a: 1\n', 'utf8');
        await truncate(path, MAX_FILE_BYTES + 1);

        await expect(readTextOrNull(path)).rejects.toThrow(/64 MiB/);
    });
});
