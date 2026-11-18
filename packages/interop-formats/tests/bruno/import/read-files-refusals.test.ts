import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import { readFiles } from '../../../src/bruno/import/read-files.js';
import { folderFiles, folderFilesUnder } from '../support/fixture.js';

const STORE = 'tienda-de-mascotas';

const GIVEN_UP = [
    'collectionKeepsNoVariables',
    'collectionKeepsNoAuth',
    'authNoEquivalentCollection',
    'authRefusedCollection',
];

describe('readFiles: several collections', () => {
    it('lists the collections one after the other, with the same name told apart', async () => {
        const read = await readFiles([
            ...folderFilesUnder('oc', 'abierta'),
            ...folderFilesUnder('bru', 'clasica'),
        ]);
        const collections = read.resources.filter((each) => each.place === 'collection');

        expect(read.name).toBe('Tienda de Mascotas');
        expect(collections.map((each) => each.name)).toEqual([
            'Tienda de Mascotas',
            'Tienda de Mascotas (2)',
        ]);
        expect(collections.map((each) => each.route)).toEqual([STORE, `${STORE}-2`]);
    });

    it('says not a word of the variables or the auth each collection keeps', async () => {
        const read = await readFiles([
            ...folderFilesUnder('oc', 'abierta'),
            ...folderFilesUnder('bru', 'clasica'),
        ]);
        const collections = read.resources.filter((each) => each.place === 'collection');

        for (const collection of collections) {
            expect(collection.degradations.map(({ code }) => code)).toEqual(
                expect.not.arrayContaining(GIVEN_UP),
            );
        }
    });
});

describe('readFiles: what it refuses', () => {
    it('refuses a folder that holds no collection', async () => {
        const attempt = readFiles([{ path: 'notas.txt', text: 'x' }]);

        await expect(attempt).rejects.toBeInstanceOf(FormatInputError);
        await expect(attempt).rejects.toThrow('the folder holds no collection of Bruno');
    });

    it('refuses to read no file', async () => {
        await expect(readFiles([])).rejects.toBeInstanceOf(FormatInputError);
    });

    it('refuses a file of a collection that Bruno itself could not read, saying which', async () => {
        const files = folderFiles('bru').map((file) =>
            file.path === 'Estado.bru' ? { ...file, text: 'this is not bru' } : file,
        );
        const attempt = readFiles(files);

        await expect(attempt).rejects.toBeInstanceOf(BrunoParseError);
        await expect(attempt).rejects.toThrow('Estado.bru: Line 1, col 1:');
    });
});
