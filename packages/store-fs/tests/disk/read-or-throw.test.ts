import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileReadError } from '../../src/disk/file-read-error.js';
import { readOrThrow } from '../../src/disk/read-or-throw.js';

let directory: string;

beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mandor-read-or-throw-'));
});

afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
});

function parseName(input: unknown): string {
    if (typeof input === 'object' && input !== null && 'name' in input) {
        return String(input.name);
    }

    throw new Error('no name');
}

describe('reading a file that a write needs', () => {
    it('answers the parsed value with the document it came from', async () => {
        const path = join(directory, 'one.yaml');

        await writeFile(path, '# kept\nname: Uno\n', 'utf8');

        const read = await readOrThrow(path, parseName);

        expect(read.value).toBe('Uno');
        expect(read.document.toString()).toContain('# kept');
    });

    it('throws a read error carrying the warning when the file is missing', async () => {
        const path = join(directory, 'missing.yaml');

        const failure = await readOrThrow(path, parseName).catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(FileReadError);
        expect((failure as FileReadError).warning.path).toBe(path);
    });

    it('throws when the content is not YAML', async () => {
        const path = join(directory, 'bad.yaml');

        await writeFile(path, 'name: Mala\nother: [\n', 'utf8');

        await expect(readOrThrow(path, parseName)).rejects.toBeInstanceOf(FileReadError);
    });

    it('throws when the parsed data is not what the caller accepts', async () => {
        const path = join(directory, 'shape.yaml');

        await writeFile(path, 'title: sin nombre\n', 'utf8');

        await expect(readOrThrow(path, parseName)).rejects.toBeInstanceOf(FileReadError);
    });
});
