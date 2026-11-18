import { type InteropFormat, type OutlineNode, workspaceOutline } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { brunoFormat, openapiFormat, postmanFormat } from '../../src/index.js';

const VARIABLE = { name: 'a', value: '1', enabled: true, secret: false };
const NOTHING = { variables: [], headers: [] };

function collectionOf(format: InteropFormat): OutlineNode | undefined {
    return workspaceOutline(
        {
            name: 'Tienda',
            connections: [],
            environments: [],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'API',
                    settings: { variables: [VARIABLE], headers: [] },
                    items: [],
                    folders: [
                        {
                            name: 'Con variables',
                            settings: { variables: [VARIABLE], headers: [] },
                            folders: [],
                            items: [],
                        },
                        { name: 'Sin nada', settings: NOTHING, folders: [], items: [] },
                        {
                            name: 'Con subcarpetas',
                            settings: NOTHING,
                            items: [],
                            folders: [{ name: 'Hondo', settings: NOTHING, folders: [], items: [] }],
                        },
                    ],
                },
            ],
        },
        format.unwritten,
        format.unkept,
    )[0];
}

function notesOf(format: InteropFormat): Record<string, OutlineNode['unkept']> {
    const folders = collectionOf(format)?.children ?? [];

    return Object.fromEntries(folders.map((folder) => [folder.label, folder.unkept]));
}

describe('what a format says it does not keep of a level', () => {
    it('Postman marks the folder with variables, and not the one without', () => {
        expect(notesOf(postmanFormat)).toEqual({
            'Con variables': ['folderVariablesUnresolved'],
            'Sin nada': undefined,
            'Con subcarpetas': undefined,
        });
    });

    it('Bruno marks nothing: it keeps every level whole', () => {
        expect(collectionOf(brunoFormat)?.unkept).toBeUndefined();
        expect(Object.values(notesOf(brunoFormat))).toEqual([undefined, undefined, undefined]);
    });

    it('OpenAPI marks the folder with subfolders, and the collection whose variables it loses', () => {
        expect(notesOf(openapiFormat)['Con subcarpetas']).toEqual(['foldersFlattened']);
        expect(collectionOf(openapiFormat)?.unkept).toEqual(['noVariables']);
    });
});
