import type { WorkspaceFolderNode } from '@mandor/interop-core';
import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { folderDocumentsOf } from '../../../src/insomnia/export/folder-documents.js';
import { insomniaIdOf } from '../../../src/insomnia/export/insomnia-id.js';
import { MESSAGE, requestOf } from '../support/sample-workspace.js';

function folderOf(
    name: string,
    parts: Partial<WorkspaceFolderNode> = {},
    auth?: ConcreteAuth,
): WorkspaceFolderNode {
    return {
        name,
        settings: { variables: [], auth, headers: [] },
        folders: [],
        items: [],
        ...parts,
    };
}

function childrenOf(folder: Record<string, unknown> | undefined): Record<string, unknown>[] {
    return (folder?.['children'] ?? []) as Record<string, unknown>[];
}

describe('folderDocumentsOf', () => {
    it('writes a folder with an id of its place, holding its requests and leaving out messages', () => {
        const [folder] = folderDocumentsOf(
            [folderOf('Admin', { items: [requestOf('borra'), MESSAGE] })],
            ['Tienda'],
            undefined,
        );

        expect(folder).toMatchObject({
            name: 'Admin',
            meta: { id: insomniaIdOf('fld', 'Tienda', 'Admin') },
        });
        expect(childrenOf(folder).map((child) => child['name'])).toEqual(['borra']);
        expect(folder).not.toHaveProperty('authentication');
    });

    it('speaks the auth of the folder, or the one above when the folder has none', () => {
        const [own, plain] = folderDocumentsOf(
            [
                folderOf('Own', { items: [requestOf('a')] }, { type: 'bearer', token: '{{t}}' }),
                folderOf('Plain', { items: [requestOf('b')] }),
            ],
            ['Tienda'],
            { type: 'basic', username: 'ana', password: '{{pw}}' },
        );

        expect(own?.['authentication']).toEqual({ type: 'bearer', token: '{{ _.t }}' });
        expect(plain?.['authentication']).toMatchObject({ type: 'basic', username: 'ana' });
        expect(childrenOf(own)[0]).not.toHaveProperty('authentication');
    });

    it('writes the description, the headers and the variables the folder declares', () => {
        const [folder] = folderDocumentsOf(
            [
                folderOf('Admin', {
                    settings: {
                        description: 'Usa {{zona}}',
                        variables: [{ name: 'zona', value: 'eu', enabled: true, secret: false }],
                        headers: [
                            { key: 'X-A', value: '{{zona}}', enabled: true },
                            { key: 'X-B', value: '1', enabled: false },
                        ],
                    },
                }),
            ],
            ['Tienda'],
            undefined,
        );

        expect(folder?.['meta']).toHaveProperty('description', 'Usa {{zona}}');
        expect(folder?.['environment']).toEqual({ zona: 'eu' });
        expect(folder?.['headers']).toEqual([
            { name: 'X-A', value: '{{ _.zona }}' },
            { name: 'X-B', value: '1', disabled: true },
        ]);
    });

    it('nests a folder that inherits on its own: what is above stops at the first level', () => {
        const [top] = folderDocumentsOf(
            [folderOf('Arriba', { folders: [folderOf('Medio')], items: [requestOf('suelta')] })],
            ['Tienda'],
            { type: 'basic', username: 'ana', password: '{{pw}}' },
        );
        const [medio, suelta] = childrenOf(top);

        expect(medio?.['name']).toBe('Medio');
        expect(medio).not.toHaveProperty('authentication');
        expect(suelta?.['name']).toBe('suelta');
    });

    it('gives two folders of one name in different branches an id each', () => {
        const documents = folderDocumentsOf(
            [
                folderOf('A', { folders: [folderOf('Hondo', { items: [requestOf('uno')] })] }),
                folderOf('B', { folders: [folderOf('Hondo', { items: [requestOf('uno')] })] }),
            ],
            ['Tienda'],
            undefined,
        );
        const [a, b] = documents.map((top) => childrenOf(top)[0]);

        expect(a).toHaveProperty('meta.id', insomniaIdOf('fld', 'Tienda', 'A', 'Hondo'));
        expect(b).toHaveProperty('meta.id', insomniaIdOf('fld', 'Tienda', 'B', 'Hondo'));
        expect(childrenOf(a)[0]).toHaveProperty(
            'meta.id',
            insomniaIdOf('req', 'Tienda', 'A', 'Hondo', 'uno'),
        );
    });

    it('writes the scripts of a folder, untouched', () => {
        const [document] = folderDocumentsOf(
            [
                {
                    name: 'Con script',
                    settings: {
                        variables: [],
                        headers: [],
                        importedScripts: [
                            { event: 'onBeforeRequest', dialect: 'insomnia', source: 'a({{b}});' },
                        ],
                    },
                    folders: [],
                    items: [],
                },
            ],
            ['Tienda'],
            undefined,
        );

        expect(document?.['scripts']).toEqual({ preRequest: 'a({{b}});' });
    });
});
