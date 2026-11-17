import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fileExists } from '../../src/disk/file-exists.js';

let directory: string;

beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mandor-exists-'));
});

afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
});

describe('asking whether a file exists', () => {
    it('says yes for a file on disk', async () => {
        const path = join(directory, 'here.yaml');

        await writeFile(path, 'a: 1\n', 'utf8');

        await expect(fileExists(path)).resolves.toBe(true);
    });

    it('says yes for a directory, which is also something at the path', async () => {
        await expect(fileExists(directory)).resolves.toBe(true);
    });

    it('says no when nothing is there, and does not throw', async () => {
        await expect(fileExists(join(directory, 'gone.yaml'))).resolves.toBe(false);
    });

    it('says no when a parent of the path is a file', async () => {
        const parent = join(directory, 'file');

        await writeFile(parent, '', 'utf8');

        await expect(fileExists(join(parent, 'child.yaml'))).resolves.toBe(false);
    });
});
