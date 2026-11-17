import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INTEROP_INPUTS } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { ALL_FORMATS, SECRET, WRITING_FORMATS, type FormatEntry } from './all-formats.js';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const TESTS = fileURLToPath(new URL('../', import.meta.url));
const SHARED = 'shared';
const EXTENSION = /^[a-z0-9]+$/u;

/** The files the folder of a format has: sniff and read-files always, documents when it writes. */
function shapeOf({ folder, format }: FormatEntry): string[] {
    const always = [
        `${folder}-format.ts`,
        `${folder}-codec.ts`,
        `document/sniff-${folder}.ts`,
        'import/read-files.ts',
    ];

    return format.writes.length === 0 ? always : [...always, 'export/documents-of.ts'];
}

function fixtureOf({ folder }: FormatEntry, name: string): string {
    return readFileSync(join(TESTS, folder, 'fixtures', name), 'utf8');
}

describe('the formats of the package', () => {
    it('lists every folder of src/ but shared, and nothing else', () => {
        const folders = readdirSync(SRC, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && entry.name !== SHARED)
            .map((entry) => entry.name);

        expect(ALL_FORMATS.map((entry) => entry.folder).sort()).toEqual(folders.sort());
    });

    it('goes by one id each', () => {
        const ids = ALL_FORMATS.map((entry) => entry.format.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('has a sample to write exactly for the formats that write', () => {
        const writing = ALL_FORMATS.filter((entry) => entry.format.writes.length > 0);

        expect(WRITING_FORMATS.map((entry) => entry.format.id)).toEqual(
            writing.map((entry) => entry.format.id),
        );
    });
});

describe.each(ALL_FORMATS)('the $format.id format', (entry) => {
    const { format } = entry;

    it.each(shapeOf(entry))('keeps %s where the folder of a format has it', (file) => {
        expect(existsSync(join(SRC, entry.folder, file))).toBe(true);
    });

    it('has documents-of only when it says it writes', () => {
        const documents = existsSync(join(SRC, entry.folder, 'export', 'documents-of.ts'));

        expect(documents).toBe(format.writes.length > 0);
    });

    it('names its files by extension, without the dot and in lowercase', () => {
        const extensions = [...format.reads, ...format.writes];

        expect(extensions.length).toBeGreaterThan(0);
        expect(extensions.every((extension) => EXTENSION.test(extension))).toBe(true);
    });

    it('asks for an input the dialogs know, and covers a scope', () => {
        expect(INTEROP_INPUTS).toContain(format.input);
        expect(format.scopes.length).toBeGreaterThan(0);
    });

    it('loads a codec with the three steps of the pipeline', async () => {
        const codec = await format.load();

        expect(Object.keys(codec).sort()).toEqual(['documentsOf', 'read', 'textOf']);
    });

    it.each(entry.fixtures)('knows %s by its sniff and no other format claims it', (name) => {
        const files = [{ path: name, text: fixtureOf(entry, name) }];
        const claimed = ALL_FORMATS.filter((other) => other.format.sniff(files)).map(
            (other) => other.format.id,
        );

        expect(claimed).toEqual([format.id]);
    });

    it('does not take two files for the one file it asks for', () => {
        const name = entry.fixtures[0] ?? '';
        const file = { path: name, text: fixtureOf(entry, name) };

        expect(format.sniff([file, file])).toBe(format.input !== 'file');
    });
});

describe.each(WRITING_FORMATS)('writing the $format.id format', (entry) => {
    async function written() {
        const codec = await entry.format.load();
        const files = codec
            .documentsOf(entry.sample.data)
            .map((file) => ({ path: file.path, text: codec.textOf(file.document) }));

        return { codec, files };
    }

    it('reads back the items it wrote under the names they had', async () => {
        const { codec, files } = await written();
        const read = await codec.read(files, 'collection');
        const names = read.resources
            .filter((resource) => resource.place === 'item')
            .map((resource) => resource.name);

        expect(names.sort()).toEqual([...entry.sample.itemNames].sort());
    });

    it('is recognized by its own sniff', async () => {
        const { files } = await written();

        expect(entry.format.sniff(files)).toBe(true);
    });

    it('never lets the value of a secret variable out', async () => {
        const { files } = await written();

        expect(files.some((file) => file.text.includes(SECRET))).toBe(false);
    });
});
