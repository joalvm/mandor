import type { WorkspaceCollectionSource, WorkspaceData } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { insomniaCodec } from '../../../src/insomnia/insomnia-codec.js';
import { readFiles } from '../../../src/insomnia/import/read-files.js';
import { resourceAt } from '../support/resources.js';
import { requestOf } from '../support/sample-workspace.js';

const BEARER = { type: 'bearer', token: '{{token}}' } as const;
const BASIC = { type: 'basic', username: 'ana', password: '{{clave}}' } as const;

function variableOf(name: string, value: string) {
    return { name, value, enabled: true, secret: false };
}

function lineOf(key: string, value: string) {
    return { key, value, enabled: true };
}

/** A collection, a folder and a folder inside it, each saying the four things a level can say. */
const THREE_LEVELS: WorkspaceCollectionSource = {
    name: 'Tienda',
    settings: {
        description: 'La tienda',
        variables: [variableOf('nivel', 'colección')],
        auth: BEARER,
        headers: [lineOf('X-Coleccion', '1')],
    },
    folders: [
        {
            name: 'Arriba',
            settings: {
                description: 'La de arriba',
                variables: [variableOf('nivel', 'arriba')],
                auth: BASIC,
                headers: [lineOf('X-Arriba', '{{nivel}}')],
            },
            folders: [
                {
                    name: 'Hondo',
                    settings: {
                        description: 'La de abajo',
                        variables: [variableOf('nivel', 'hondo')],
                        auth: BEARER,
                        headers: [lineOf('X-Hondo', '3')],
                    },
                    folders: [],
                    items: [requestOf('dentro')],
                },
            ],
            items: [],
        },
    ],
    items: [requestOf('suelta')],
};

const WORKSPACE: WorkspaceData = {
    name: 'Tienda',
    connections: [],
    environments: [],
    globals: [variableOf('nivel', 'global'), variableOf('host', 'x')],
    docs: [],
    collections: [THREE_LEVELS],
};

async function resourcesAfterExport() {
    const files = insomniaCodec
        .documentsOf(WORKSPACE)
        .map((file) => ({ path: file.path, text: insomniaCodec.textOf(file.document) }));
    const read = await readFiles(files);

    return read.resources;
}

describe('three levels through a file of Insomnia', () => {
    it('brings the description back to the collection, and its variables over the globals', async () => {
        const resources = await resourcesAfterExport();
        const collection = resourceAt(resources, 'collection', 'tienda');

        expect(collection.fields).toEqual({
            name: 'Tienda',
            description: 'La tienda',
            variables: [variableOf('nivel', 'colección'), variableOf('host', 'x')],
        });
        expect(collection.degradations).toEqual([]);
    });

    it('brings the four settings back to each folder; the first holds what came from above', async () => {
        const resources = await resourcesAfterExport();
        const arriba = resourceAt(resources, 'folder', 'tienda/arriba');
        const hondo = resourceAt(resources, 'folder', 'tienda/arriba/hondo');

        expect(arriba.fields).toEqual({
            description: 'La de arriba',
            variables: [variableOf('nivel', 'arriba')],
            auth: BASIC,
            headers: [lineOf('X-Coleccion', '1'), lineOf('X-Arriba', '{{nivel}}')],
        });
        expect(hondo.fields).toEqual({
            description: 'La de abajo',
            variables: [variableOf('nivel', 'hondo')],
            auth: BEARER,
            headers: [lineOf('X-Hondo', '3')],
        });
        expect(arriba.degradations).toEqual([]);
        expect(hondo.degradations).toEqual([]);
    });

    it('brings the header of the collection to the loose request, with its auth', async () => {
        const suelta = resourceAt(await resourcesAfterExport(), 'item', 'tienda/suelta');

        expect(suelta.fields).toMatchObject({
            headers: [lineOf('X-Coleccion', '1')],
            auth: BEARER,
        });
    });
});
