import { FormatInputError } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { InsomniaParseError } from '../../../src/insomnia/document/insomnia-parse-error.js';
import { readFiles } from '../../../src/insomnia/import/read-files.js';
import { fixtureText } from '../support/fixture.js';

function v4Named(name: string, id: string): { path: string; text: string } {
    const text = JSON.stringify({
        _type: 'export',
        __export_format: 4,
        resources: [{ _id: id, _type: 'workspace', name }],
    });

    return { path: `${id}.json`, text };
}

describe('readFiles: several files', () => {
    it('names the workspace after the first collection', async () => {
        const read = await readFiles([
            { path: 'a.json', text: fixtureText('collection-v4.json') },
            { path: 'b.yaml', text: fixtureText('collection-v5.yaml') },
        ]);

        expect(read.name).toBe('Tienda de Mascotas');
    });

    it('files collections of one name apart, the later ones with a number', async () => {
        const read = await readFiles([
            v4Named('Tienda', 'w1'),
            v4Named('Tienda', 'w2'),
            v4Named('Tienda', 'w3'),
            v4Named('', 'w4'),
            v4Named(' ', 'w5'),
        ]);
        const collections = read.resources.filter((each) => each.place === 'collection');

        expect(collections.map((each) => each.name)).toEqual([
            'Tienda',
            'Tienda (2)',
            'Tienda (3)',
            'Insomnia',
            'Insomnia (2)',
        ]);
        expect(collections.map((each) => each.route)).toEqual([
            'tienda',
            'tienda-2',
            'tienda-3',
            'insomnia',
            'insomnia-2',
        ]);
    });

    it('takes every collection of an export of the whole app', async () => {
        const text = JSON.stringify({
            _type: 'export',
            __export_format: 4,
            resources: [
                { _id: 'w1', _type: 'workspace', name: 'Uno' },
                { _id: 'w2', _type: 'workspace', name: 'Dos' },
            ],
        });
        const read = await readFiles([{ path: 'all.json', text }]);

        expect(read.resources.map((each) => each.name)).toEqual(['Uno', 'Dos']);
    });
});

describe('readFiles: what it refuses', () => {
    it('refuses to read no file', async () => {
        await expect(readFiles([])).rejects.toBeInstanceOf(FormatInputError);
    });

    it('refuses a file that is not an Insomnia one, saying why', async () => {
        const attempt = readFiles([{ path: 'x.json', text: '{"info":{}}' }]);

        await expect(attempt).rejects.toBeInstanceOf(InsomniaParseError);
        await expect(attempt).rejects.toThrow('This is not an Insomnia export');
    });
});
