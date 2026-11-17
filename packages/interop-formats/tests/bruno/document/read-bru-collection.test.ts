import { describe, expect, it } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import { readBru } from '../../../src/bruno/document/read-bru-collection.js';
import { folderFiles, folderFilesWithout } from '../support/fixture.js';

function file(path: string, text: string) {
    return { path, text };
}

const ROOT = file('bruno.json', '{"version":"1","name":"Tienda","type":"collection"}');

describe('readBru: the folder of fixtures', () => {
    const document = readBru(folderFiles('bru'));

    it('reads what the collection is called and says of itself', () => {
        expect(document).toMatchObject({
            name: 'Tienda de Mascotas',
            description: 'Todo lo de la tienda.',
            headers: [{ name: 'Accept', value: 'application/json', disabled: false }],
            auth: { type: 'bearer', token: '{{token}}' },
            variables: [{ name: 'region', value: 'eu', disabled: false, secret: false }],
            leftOut: ['scripts'],
        });
        expect(document.sourceId).toMatch(/^collection:/u);
    });

    it('reads the folders and requests in the order they declare', () => {
        expect(document.children.map((node) => `${node.kind}:${node.name}`)).toEqual([
            'folder:Mascotas',
            'folder:Admin',
            'request:Consulta de pedidos',
            'request:Estado',
            'websocket:Pedidos en vivo',
        ]);
        expect(document.children[0]).toMatchObject({
            auth: { type: 'inherit' },
            headers: [{ name: 'X-Team', value: 'perros', disabled: false }],
            children: [
                { name: 'Lista de mascotas' },
                { name: 'Crear mascota', tags: ['smoke'], leftOut: ['scripts'] },
                { name: 'Subir foto' },
            ],
        });
    });

    it('reads the environments of environments/ and names the request it left out', () => {
        expect(document.environments).toEqual([
            {
                name: 'Local',
                variables: [
                    {
                        name: 'baseUrl',
                        value: 'http://localhost:3000',
                        disabled: false,
                        secret: false,
                    },
                ],
            },
            {
                name: 'Prod',
                variables: [
                    {
                        name: 'baseUrl',
                        value: 'https://api.tienda.test',
                        disabled: false,
                        secret: false,
                    },
                    { name: 'debug', value: '1', disabled: true, secret: false },
                    { name: 'token', value: '', disabled: false, secret: true },
                ],
            },
        ]);
        expect(document.skipped).toEqual([]);
    });
});

describe('readBru: other shapes of the same layout', () => {
    it('reads a collection with nothing in it, called as its bruno.json says', () => {
        expect(readBru([ROOT])).toMatchObject({
            name: 'Tienda',
            description: '',
            headers: [],
            auth: undefined,
            variables: [],
            children: [],
            environments: [],
            skipped: [],
            leftOut: [],
        });
    });

    it('has no name for a bruno.json that gives none', () => {
        expect(readBru([file('bruno.json', '{"version":"1"}')]).name).toBe('');
    });

    it('reads the variables the collection sets before each request', () => {
        const text = 'vars:pre-request {\n  a: 1\n  ~b: 2\n}\n';
        const document = readBru([ROOT, file('collection.bru', text)]);

        expect(document.variables).toEqual([
            { name: 'a', value: '1', disabled: false, secret: false },
            { name: 'b', value: '2', disabled: true, secret: false },
        ]);
    });

    it('ignores the files that are not .bru', () => {
        expect(readBru([ROOT, file('notas.txt', 'x'), file('x/y.yml', 'x')]).children).toEqual([]);
    });
});

describe('readBru: files that cannot be read', () => {
    it('says the bruno.json is missing', () => {
        expect(() => readBru(folderFilesWithout('bru', 'bruno.json'))).toThrow(
            new BrunoParseError(['bruno.json: the file is missing']),
        );
    });

    it('says which file the parser refused', () => {
        expect(() => readBru([ROOT, file('collection.bru', 'headers {\n  a')])).toThrow(
            'collection.bru: Line 2, col 4:',
        );
        expect(() => readBru([ROOT, file('Mal.bru', 'this is not bru')])).toThrow(
            'Mal.bru: Line 1, col 1:',
        );
        expect(() => readBru([ROOT, file('environments/E.bru', 'vars {\n  a')])).toThrow(
            'environments/E.bru: Line 2, col 4:',
        );
    });
});
