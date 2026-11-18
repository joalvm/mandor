import { mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MAX_FILE_BYTES, readFileText } from '../../src/disk/read-file-text.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

/** A file of the given size that takes no room: the size is what the cap looks at. */
async function sized(name: string, bytes: number): Promise<string> {
    const path = join(root, name);

    await writeFile(path, 'a: 1\n', 'utf8');
    await truncate(path, bytes);

    return path;
}

describe('reading the text of a file', () => {
    it('returns the text as it sits on disk', async () => {
        await writeFile(join(root, 'a.yaml'), '\uFEFFa: ñandú\r\n', 'utf8');

        expect(await readFileText(join(root, 'a.yaml'))).toBe('\uFEFFa: ñandú\r\n');
    });

    it('reads a file as large as the cap', async () => {
        const text = await readFileText(await sized('a.yaml', MAX_FILE_BYTES));

        expect(text.startsWith('a: 1\n')).toBe(true);
        expect(text).toHaveLength(MAX_FILE_BYTES);
    });

    /**
     * Parsing a file holds it many times over in memory, and main is one process for every
     * window: a file of gigabytes that a pull brought in would take the app down with it.
     */
    it('refuses a file past the cap without reading it', async () => {
        const path = await sized('a.yaml', MAX_FILE_BYTES + 1);

        await expect(readFileText(path)).rejects.toThrow(/64 MiB/);
    });

    it('lets the failure of a file that is not there through as the disk gave it', async () => {
        await expect(readFileText(join(root, 'nada.yaml'))).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });
});
