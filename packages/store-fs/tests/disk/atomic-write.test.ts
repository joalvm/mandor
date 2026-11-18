import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { atomicWrite } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing a file atomically', () => {
    it('creates the destination with the given contents', async () => {
        const path = join(root, 'mandor.yaml');

        await atomicWrite(path, 'name: Mi repo\n');

        expect(await readFile(path, 'utf8')).toBe('name: Mi repo\n');
    });

    it('replaces an existing file without leaving a temporary behind', async () => {
        const path = join(root, 'mandor.yaml');

        await writeFile(path, 'name: Viejo\n', 'utf8');
        await atomicWrite(path, 'name: Nuevo\n');

        expect(await readFile(path, 'utf8')).toBe('name: Nuevo\n');
        expect(await readdir(root)).toEqual(['mandor.yaml']);
    });

    /** A failed write must not leave a half file for the next reader to find. */
    it('removes the temporary and rejects when the destination cannot be replaced', async () => {
        const path = join(root, 'workspaces');

        await mkdir(path);

        await expect(atomicWrite(path, 'name: Nuevo\n')).rejects.toThrow();
        expect(await readdir(root)).toEqual(['workspaces']);
    });

    /** Two saves of one file in flight at once: each must land whole, never the other's half. */
    it('lets writes of the same file overlap and leaves one of them whole', async () => {
        const path = join(root, 'origins.json');
        const contents = Array.from(
            { length: 12 },
            (_, index) => `${'x'.repeat(4096)}${String(index)}`,
        );

        await Promise.all(contents.map((text) => atomicWrite(path, text)));

        expect(contents).toContain(await readFile(path, 'utf8'));
        expect(await readdir(root)).toEqual(['origins.json']);
    });
});

/** The one guard that keeps a crash from truncating a file the user cannot get back. */
describe('the package as a whole', () => {
    it('writes to disk only through the atomic path', async () => {
        const src = new URL('../../src/', import.meta.url);
        const files = await readdir(src, { recursive: true, withFileTypes: true });
        const offenders: string[] = [];

        for (const file of files) {
            await collectDirectWriters(file, offenders);
        }

        expect(offenders).toEqual([]);
    });
});

async function collectDirectWriters(
    file: { name: string; parentPath: string; isFile: () => boolean },
    offenders: string[],
): Promise<void> {
    if (!file.isFile() || file.name === 'atomic-write.ts') {
        return;
    }

    const source = await readFile(join(file.parentPath, file.name), 'utf8');

    if (source.includes('writeFile')) {
        offenders.push(file.name);
    }
}
