import { documentYamlOf, type ImportResource, type WorkspaceData } from '@mandor/interop-core';
import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/openapi/export/documents-of.js';
import { documentToInterop } from '../../../src/openapi/import/document-to-interop.js';
import { importResourcesOf } from '../../../src/openapi/import/import-resources.js';

const SETTINGS = { variables: [], headers: [] };

function request(name: string): CollectionItem {
    return {
        kind: 'request',
        name,
        tags: [],
        body: { method: 'GET', url: `http://a.test/${name}` },
    };
}

const WORKSPACE: WorkspaceData = {
    name: 'Tienda',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [
        {
            name: 'API',
            settings: {
                variables: [],
                headers: [{ key: 'X-Tienda', value: '1', enabled: true }],
            },
            items: [],
            folders: [
                {
                    name: 'Zeta',
                    settings: { ...SETTINGS, description: 'Lo de Zeta' },
                    folders: [
                        {
                            name: 'Hondo',
                            settings: { ...SETTINGS, description: 'Se pierde al aplanar' },
                            folders: [],
                            items: [request('hondo')],
                        },
                    ],
                    items: [],
                },
                {
                    name: 'a:b',
                    settings: { ...SETTINGS, description: 'Con dos puntos' },
                    folders: [],
                    items: [request('dos-puntos')],
                },
                {
                    name: 'Sin doc',
                    settings: SETTINGS,
                    folders: [],
                    items: [request('sin-doc')],
                },
                {
                    name: 'Vacía',
                    settings: { ...SETTINGS, description: 'Nadie la abre' },
                    folders: [],
                    items: [],
                },
            ],
        },
    ],
};

function documentOf(workspace: WorkspaceData): Record<string, unknown> {
    const [file] = documentsOf(workspace);

    return file?.document ?? {};
}

async function resourcesOfText(text: string): Promise<ImportResource[]> {
    return importResourcesOf(await documentToInterop(text), 'workspace');
}

function foldersOf(resources: readonly ImportResource[]): ImportResource[] {
    return resources.filter((resource) => resource.place === 'folder');
}

describe('the folders of a workspace through an OpenAPI document', () => {
    it('writes a tag per folder of the first level with requests, in order and with its doc', () => {
        expect(documentOf(WORKSPACE)['tags']).toEqual([
            { name: 'Zeta', description: 'Lo de Zeta' },
            { name: 'a:b', description: 'Con dos puntos' },
            { name: 'Sin doc' },
        ]);
    });

    it('writes no tags at all for a workspace with no folders', () => {
        const bare = {
            ...WORKSPACE,
            collections: [
                { name: 'API', settings: SETTINGS, folders: [], items: [request('suelta')] },
            ],
        };

        expect(documentOf(bare)).not.toHaveProperty('tags');
    });

    it('comes back with each folder of the first level, its doc and its name', async () => {
        const folders = foldersOf(await resourcesOfText(documentYamlOf(documentOf(WORKSPACE))));

        expect(folders.map((folder) => folder.fields)).toEqual([
            { name: 'Zeta', description: 'Lo de Zeta' },
            { name: 'a:b', description: 'Con dos puntos' },
            { name: 'Sin doc' },
        ]);
    });

    it('sends a header of the collection as a parameter of every operation', async () => {
        const ir = await documentToInterop(documentYamlOf(documentOf(WORKSPACE)));
        const headers = ir.operations.map((operation) =>
            operation.http?.parameters
                .filter((parameter) => parameter.in === 'header')
                .map((parameter) => parameter.name),
        );

        expect(headers).toEqual([['X-Tienda'], ['X-Tienda'], ['X-Tienda']]);
    });
});

describe('the tags at the root of an OpenAPI document', () => {
    const DOCUMENT = `
openapi: 3.1.0
info: { title: Tienda, version: 1.0.0 }
tags:
  - { name: Segundo, description: El doc del segundo }
  - { name: Primero }
  - { name: Sin operaciones, description: Nadie lo abre }
paths:
  /uno:
    get: { operationId: uno, tags: [Primero], responses: { '200': { description: ok } } }
  /dos:
    get: { operationId: dos, tags: [Segundo], responses: { '200': { description: ok } } }
  /tres:
    get: { operationId: tres, tags: [Suelto], responses: { '200': { description: ok } } }
`;

    it('are the groups of the document, each with its description', async () => {
        const ir = await documentToInterop(DOCUMENT);

        expect(ir.groups?.map((group) => [group.path, group.description])).toEqual([
            [['Segundo'], 'El doc del segundo'],
            [['Primero'], undefined],
            [['Sin operaciones'], 'Nadie lo abre'],
        ]);
    });

    it('order the folders, and a tag nobody declares follows them; none opens one alone', async () => {
        const folders = foldersOf(await resourcesOfText(DOCUMENT));

        expect(folders.map((folder) => folder.name)).toEqual(['Segundo', 'Primero', 'Suelto']);
        expect(folders[0]?.fields).toEqual({
            name: 'Segundo',
            description: 'El doc del segundo',
        });
    });
});
