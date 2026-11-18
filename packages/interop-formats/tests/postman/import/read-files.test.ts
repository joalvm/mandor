import { FormatInputError, type InteropFile, type InteropRead } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { readFiles } from '../../../src/postman/import/read-files.js';
import { fixtureText } from '../support/fixture.js';

function fileOf(name: string): InteropFile {
    return { path: name, text: fixtureText(name) };
}

function countOf(read: InteropRead, place: string): number {
    return read.resources.filter((resource) => resource.place === place).length;
}

describe('reading a Postman import', () => {
    it('reads its one collection into the name it gave itself, the collection first', async () => {
        const read = await readFiles([fileOf('collection-v2.1.json')]);

        expect(read.name).toBe('Demo API');
        expect(read.resources[0]?.place).toBe('collection');
        expect(read.resources.some((resource) => resource.place === 'item')).toBe(true);
    });

    it('refuses what is not a Postman file, saying why', async () => {
        await expect(readFiles([{ path: 'a.json', text: '[]' }])).rejects.toThrow(/not a Postman/);
    });

    it('refuses to read nothing', async () => {
        await expect(readFiles([])).rejects.toBeInstanceOf(FormatInputError);
    });

    it('reads a collection and its environment as one import, writing on no workspace', async () => {
        const read = await readFiles([fileOf('collection-v2.1.json'), fileOf('environment.json')]);

        expect(read.name).toBe('Demo API');
        expect(countOf(read, 'workspace')).toBe(0);
        expect(countOf(read, 'environment')).toBe(1);
        expect(countOf(read, 'collection')).toBe(1);
    });

    it('reads an environment alone without making a collection out of it', async () => {
        const read = await readFiles([fileOf('environment.json')]);

        expect(read.name).toBe('Local');
        expect(read.resources.map((resource) => resource.place)).toEqual(['environment']);
    });

    it('reads the globals as the globals of the origin', async () => {
        const read = await readFiles([fileOf('globals.json')]);

        expect(read.name).toBe('globals');
        expect(read.resources.map((resource) => resource.place)).toEqual(['globals']);
        expect(read.resources[0]?.fields['variables']).toEqual([
            { name: 'region', value: 'eu', enabled: true, secret: false },
        ]);
    });

    it('makes the globals of the origin out of the globals file alone', async () => {
        const globals = {
            path: 'g.json',
            text: JSON.stringify({
                name: 'G',
                values: [{ key: 'base', value: 'from-globals', enabled: true }],
                _postman_variable_scope: 'globals',
            }),
        };
        const read = await readFiles([globals, fileOf('collection-v2.1.json')]);
        const variables = read.resources.find((resource) => resource.place === 'globals')?.fields[
            'variables'
        ] as {
            name: string;
            value: string;
        }[];

        expect(variables).toEqual([
            { name: 'base', value: 'from-globals', enabled: true, secret: false },
        ]);
    });

    it('keeps the variable of a collection in the collection', async () => {
        const read = await readFiles([fileOf('collection-v2.1.json')]);
        const collection = read.resources.find((resource) => resource.place === 'collection');

        expect(collection?.fields['variables']).toContainEqual({
            name: 'base',
            value: 'http://127.0.0.1:1',
            enabled: true,
            secret: false,
        });
        expect(countOf(read, 'workspace')).toBe(0);
    });

    it('reads two collections into two, the second named apart from the first', async () => {
        const file = fileOf('collection-v2.1.json');
        const read = await readFiles([file, file]);
        const collections = read.resources.filter((resource) => resource.place === 'collection');

        expect(collections.map((collection) => collection.name)).toEqual([
            'Demo API',
            'Demo API (2)',
        ]);
        expect(countOf(read, 'workspace')).toBe(0);
    });
});
