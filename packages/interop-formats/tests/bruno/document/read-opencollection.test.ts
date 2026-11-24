import { describe, expect, it } from 'vitest';

import type { BrunoNode } from '../../../src/bruno/document/bruno-tree.js';
import { readOpenCollection } from '../../../src/bruno/document/read-opencollection.js';
import { folderFiles } from '../support/fixture.js';

function namesOf(nodes: readonly BrunoNode[]): string[] {
    return nodes.map((node) => `${node.kind}:${node.name}`);
}

describe('readOpenCollection: the folder of fixtures', () => {
    const document = readOpenCollection(folderFiles('oc'));

    it('reads what the collection is called and says of itself', () => {
        expect(document).toMatchObject({
            name: 'Tienda de Mascotas',
            description: 'Todo lo de la tienda.\n',
            headers: [{ name: 'Accept', value: 'application/json', disabled: false }],
            auth: { type: 'bearer', token: '{{token}}' },
            variables: [{ name: 'region', value: 'eu', disabled: false, secret: false }],
            scripts: { onBeforeRequest: { source: "console.log('hola')" } },
            leftOut: [],
        });
        expect(document.sourceId).toMatch(/^collection:/u);
    });

    it('reads the folders and requests in the order they declare', () => {
        expect(namesOf(document.children)).toEqual([
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
                {
                    name: 'Crear mascota',
                    tags: ['smoke'],
                    scripts: { onBeforeRequest: { source: "console.log('antes')" } },
                    leftOut: [],
                },
                { name: 'Subir foto' },
            ],
        });
    });

    it('reads each part of a request', () => {
        const folder = document.children[0];
        const lista = folder?.kind === 'folder' ? folder.children[0] : undefined;

        expect(lista).toMatchObject({
            method: 'GET',
            url: '{{baseUrl}}/pets?limit=10&page=2',
            params: [
                { name: 'limit', value: '10', disabled: false },
                { name: 'debug', value: '1', disabled: true },
            ],
            headers: [{ name: 'Accept-Language', value: 'es', disabled: false }],
            auth: { type: 'inherit' },
            description: 'Lista las mascotas.',
        });
    });

    it('reads the environments of environments/, and what it does not read as left out', () => {
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
                    { name: 'token', value: '', disabled: false, secret: true },
                    { name: 'debug', value: '1', disabled: true, secret: false },
                ],
            },
        ]);
        expect(document.skipped).toEqual([]);
    });
});
