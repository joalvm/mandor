import { documentYamlOf, type ImportResource, type WorkspaceData } from '@mandor/interop-core';
import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/asyncapi/export/documents-of.js';
import { documentToInterop } from '../../../src/asyncapi/import/document-to-interop.js';
import { importResourcesOf } from '../../../src/asyncapi/import/import-resources.js';

const SETTINGS = { variables: [], headers: [] };

function message(name: string): CollectionItem {
    return {
        kind: 'message',
        name,
        tags: [],
        body: { channel: name, payload: '{}', payloadType: 'json' },
    };
}

const WORKSPACE: WorkspaceData = {
    name: 'Pasarela',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [
        {
            name: 'Eventos',
            settings: SETTINGS,
            items: [message('suelto')],
            folders: [
                {
                    name: 'Pedidos',
                    settings: { ...SETTINGS, description: 'Lo de pedidos' },
                    folders: [
                        {
                            name: 'Hondo',
                            settings: { ...SETTINGS, description: 'Se pierde al aplanar' },
                            folders: [],
                            items: [message('hondo')],
                        },
                    ],
                    items: [],
                },
                {
                    name: 'a:b',
                    settings: { ...SETTINGS, description: 'Con dos puntos' },
                    folders: [],
                    items: [message('dos-puntos')],
                },
                { name: 'Sin doc', settings: SETTINGS, folders: [], items: [message('sin-doc')] },
            ],
        },
    ],
};

function documentOf(workspace: WorkspaceData): Record<string, Record<string, unknown>> {
    const [file] = documentsOf(workspace);

    return (file?.document ?? {}) as Record<string, Record<string, unknown>>;
}

async function foldersOfText(text: string): Promise<ImportResource[]> {
    const resources = importResourcesOf(await documentToInterop(text));

    return resources.filter((resource) => resource.place === 'folder');
}

describe('the folders of a workspace through an AsyncAPI document', () => {
    it('tags each operation with its folder of the first level, however deep it hangs', () => {
        const { operations } = documentOf(WORKSPACE);

        expect(operations?.['hondo']).toMatchObject({ tags: [{ name: 'Pedidos' }] });
        expect(operations?.['sin-doc']).toMatchObject({ tags: [{ name: 'Sin doc' }] });
        expect(operations?.['dos-puntos']).toMatchObject({ tags: [{ name: 'group:a:b' }] });
        expect(operations?.['suelto']).toMatchObject({ tags: [{ name: 'Eventos' }] });
    });

    it('keeps in the tags of its info the doc of each folder of the first level', () => {
        expect(documentOf(WORKSPACE)['info']?.['tags']).toEqual([
            { name: 'Pedidos', description: 'Lo de pedidos' },
            { name: 'group:a:b', description: 'Con dos puntos' },
        ]);
    });

    it('writes no tags in its info when no folder has a doc', () => {
        const bare = {
            ...WORKSPACE,
            collections: [
                { name: 'Eventos', settings: SETTINGS, folders: [], items: [message('solo')] },
            ],
        };

        expect(documentOf(bare)['info']).not.toHaveProperty('tags');
    });

    it('comes back with each folder of the first level, its doc and its name', async () => {
        const folders = await foldersOfText(documentYamlOf(documentOf(WORKSPACE)));
        const byName = Object.fromEntries(folders.map((folder) => [folder.name, folder.fields]));

        expect(byName).toEqual({
            Pedidos: { name: 'Pedidos', description: 'Lo de pedidos' },
            'a:b': { name: 'a:b', description: 'Con dos puntos' },
            'Sin doc': { name: 'Sin doc' },
            Eventos: { name: 'Eventos' },
        });
    });
});

describe('the tags of a document that says what its groups are', () => {
    it('are read at the root of a document 2.x', async () => {
        const folders = await foldersOfText(`
asyncapi: 2.6.0
info: { title: Pedidos, version: 1.0.0 }
tags:
  - { name: pagos, description: El doc de pagos }
  - { name: 'domain:envios', description: El doc de envios }
  - { name: mudo }
channels:
  pagos:
    subscribe:
      operationId: pagar
      tags: [{ name: pagos }]
      message: { payload: { type: object } }
  envios:
    subscribe:
      operationId: enviar
      tags: [{ name: 'domain:envios' }]
      message: { payload: { type: object } }
`);

        expect(folders.map((folder) => folder.fields)).toEqual([
            { name: 'pagos', description: 'El doc de pagos' },
            { name: 'envios', description: 'El doc de envios' },
        ]);
    });
});
