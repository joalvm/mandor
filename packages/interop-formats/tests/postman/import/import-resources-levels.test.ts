import {
    degradation,
    type ImportResource,
    type InteropFile,
    type WorkspaceCollectionSource,
} from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { collectionDocumentOf } from '../../../src/postman/export/workspace-to-collection.js';
import { readFiles } from '../../../src/postman/import/read-files.js';
import { requestOf } from '../support/sample-workspace.js';

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

function resourceOf(
    resources: readonly ImportResource[],
    place: ImportResource['place'],
    route?: string,
): ImportResource | undefined {
    return resources.find(
        (each) => each.place === place && (route === undefined || each.route === route),
    );
}

function fileOf(document: unknown): InteropFile {
    return { path: 'a.json', text: JSON.stringify(document) };
}

describe('what a level of Postman declares stays at that level', () => {
    it('keeps a variable an environment also names in the collection, with no row', async () => {
        const read = await readFiles([
            fileOf({
                info: { name: 'Tienda', schema: SCHEMA },
                variable: [{ key: 'base', value: 'de-coleccion' }],
                item: [],
            }),
            fileOf({
                name: 'Prod',
                values: [{ key: 'base', value: 'de-entorno', enabled: true }],
                _postman_variable_scope: 'environment',
            }),
        ]);
        const collection = resourceOf(read.resources, 'collection');

        expect(collection?.fields['variables']).toEqual([
            { name: 'base', value: 'de-coleccion', enabled: true, secret: false },
        ]);
        expect(collection?.degradations).toEqual([]);
        expect(resourceOf(read.resources, 'environment')?.fields['variables']).toEqual([
            { name: 'base', value: 'de-entorno', enabled: true, secret: false },
        ]);
    });

    it('keeps an item-group variable in the folder, saying Postman did not resolve it', async () => {
        const read = await readFiles([
            fileOf({
                info: { name: 'Tienda', schema: SCHEMA },
                item: [{ name: 'A', item: [], variable: [{ key: 'zona', value: 'eu' }] }],
            }),
        ]);
        const folder = resourceOf(read.resources, 'folder', 'tienda/a');

        expect(folder?.fields['variables']).toEqual([
            { name: 'zona', value: 'eu', enabled: true, secret: false },
        ]);
        expect(folder?.degradations).toEqual([degradation('folderVariablesWin')]);
    });

    it('gives the scripts of two collections to each, with nothing on the workspace', async () => {
        const scriptOf = (line: string) => ({
            listen: 'test',
            script: { type: 'text/javascript', exec: [line] },
        });
        const read = await readFiles([
            fileOf({ info: { name: 'Uno', schema: SCHEMA }, event: [scriptOf('uno()')], item: [] }),
            fileOf({ info: { name: 'Dos', schema: SCHEMA }, event: [scriptOf('dos()')], item: [] }),
        ]);

        expect(resourceOf(read.resources, 'workspace')).toBeUndefined();
        expect(resourceOf(read.resources, 'collection', 'uno')?.fields['scripts']).toEqual({
            onResponse: { source: 'uno()' },
        });
        expect(resourceOf(read.resources, 'collection', 'dos')?.fields['scripts']).toEqual({
            onResponse: { source: 'dos()' },
        });
    });

    it('covers each setting in the fingerprint a collection is claimed with', async () => {
        const read = async (more: object) =>
            resourceOf(
                (
                    await readFiles([
                        fileOf({ info: { name: 'A', schema: SCHEMA }, item: [], ...more }),
                    ])
                ).resources,
                'collection',
            )?.origin.fingerprint;
        const plain = await read({});

        expect(await read({ variable: [{ key: 'a', value: '1' }] })).not.toBe(plain);
    });
});

describe('a collection through Postman and back', () => {
    const SETTINGS = {
        description: 'Lo suyo',
        variables: [{ name: 'zona', value: 'eu', enabled: true, secret: false }],
        auth: { type: 'bearer', token: '{{t}}' },
        headers: [],
    } as const;
    const COLLECTION: WorkspaceCollectionSource = {
        name: 'Tienda',
        settings: { ...SETTINGS, description: 'De la tienda' },
        folders: [
            {
                name: 'A',
                settings: { ...SETTINGS, variables: [{ ...SETTINGS.variables[0], name: 'de-a' }] },
                folders: [
                    {
                        name: 'B',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [requestOf('hondo')],
                    },
                ],
                items: [],
            },
        ],
        items: [],
    };

    it('brings the description, the variables and the auth of each level back to it', async () => {
        const read = await readFiles([fileOf(collectionDocumentOf(COLLECTION, {}))]);
        const collection = resourceOf(read.resources, 'collection');
        const folder = resourceOf(read.resources, 'folder', 'tienda/a');

        expect(collection?.fields).toMatchObject({
            description: 'De la tienda',
            variables: SETTINGS.variables,
            auth: SETTINGS.auth,
        });
        expect(folder?.fields).toMatchObject({
            description: 'Lo suyo',
            variables: [{ ...SETTINGS.variables[0], name: 'de-a' }],
            auth: SETTINGS.auth,
        });
        expect(resourceOf(read.resources, 'folder', 'tienda/a/b')?.fields).toEqual({});
    });
});
