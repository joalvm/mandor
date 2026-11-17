import type { WorkspaceCollectionSource } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { collectionFilesOf } from '../../../src/bruno/export/workspace-to-opencollection.js';
import { MASCOTAS, PROD, SYNC_WORKSPACE, requestOf } from '../support/sample-workspace.js';

const WORKSPACE = { auth: undefined, connections: [], environments: [], globals: [] };

function collectionOf(overrides: Partial<WorkspaceCollectionSource> = {}) {
    return {
        name: 'Tienda',
        settings: { variables: [], headers: [] },
        folders: [],
        items: [],
        ...overrides,
    };
}

describe('collectionFilesOf: the files of a workspace', () => {
    const files = collectionFilesOf(MASCOTAS, SYNC_WORKSPACE);

    it('writes opencollection.yml, a directory for each folder, a file for each request and the environments', () => {
        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'admin/folder.yml',
            'admin/borrarmascota.yml',
            'listamascotas.yml',
            'environments/prod.yml',
        ]);
    });

    it('says in opencollection.yml what the collection is and what it asks of every request', () => {
        expect(files[0]?.document).toEqual({
            opencollection: '1.0.0',
            info: { name: 'Mascotas' },
            docs: 'Todo lo de las mascotas',
            request: {
                auth: { type: 'bearer', token: '{{token}}' },
                variables: [{ name: 'region', value: 'eu' }],
            },
        });
    });

    it('lists the folders first and the requests after them', () => {
        expect(files[1]?.document).toMatchObject({
            info: { name: 'Admin', type: 'folder', seq: 1 },
        });
        expect(files[3]?.document).toMatchObject({ info: { name: 'listaMascotas', seq: 2 } });
    });

    it('leaves the messages out, since Bruno has no place for them', () => {
        expect(JSON.stringify(files)).not.toContain('registrarPedido');
    });
});

describe('collectionFilesOf: what the collection asks of every request', () => {
    it('asks for the auth of the collection before the one of the workspace', () => {
        const [root] = collectionFilesOf(
            collectionOf({
                settings: {
                    variables: [],
                    auth: { type: 'basic', username: 'ana', password: '{{pw}}' },
                    headers: [],
                },
            }),
            { ...WORKSPACE, auth: { type: 'bearer', token: '{{t}}' } },
        );

        expect(root?.document).toMatchObject({ request: { auth: { type: 'basic' } } });
    });

    it('writes no auth when the collection stops it', () => {
        const [root] = collectionFilesOf(
            collectionOf({ settings: { variables: [], auth: { type: 'none' }, headers: [] } }),
            {
                ...WORKSPACE,
                auth: { type: 'bearer', token: '{{t}}' },
            },
        );

        expect(root?.document).toEqual({ opencollection: '1.0.0', info: { name: 'Tienda' } });
    });

    it('writes no request defaults for a collection that asks nothing', () => {
        const [root] = collectionFilesOf(collectionOf(), WORKSPACE);

        expect(root?.document).toEqual({ opencollection: '1.0.0', info: { name: 'Tienda' } });
    });

    it('writes the variables of the workspace and no auth when only those are asked', () => {
        const [root] = collectionFilesOf(collectionOf(), {
            ...WORKSPACE,
            globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
        });

        expect(root?.document).toMatchObject({
            request: { variables: [{ name: 'region', value: 'eu' }] },
        });
        expect(root?.document['request']).not.toHaveProperty('auth');
    });
});

describe('collectionFilesOf: what the collection itself says', () => {
    it('writes its headers, and its variables over the globals: the collection wins', () => {
        const [root] = collectionFilesOf(
            collectionOf({
                settings: {
                    variables: [{ name: 'zona', value: 'sur', enabled: true, secret: false }],
                    headers: [{ key: 'X-A', value: '1', enabled: true }],
                },
            }),
            {
                ...WORKSPACE,
                globals: [
                    { name: 'zona', value: 'norte', enabled: true, secret: false },
                    { name: 'host', value: 'x', enabled: true, secret: false },
                ],
            },
        );

        expect(root?.document['request']).toEqual({
            headers: [{ name: 'X-A', value: '1' }],
            variables: [
                { name: 'zona', value: 'sur' },
                { name: 'host', value: 'x' },
            ],
        });
    });
});

describe('collectionFilesOf: names on disk', () => {
    it('keeps the requests and folders off the names the collection reserves', () => {
        const files = collectionFilesOf(
            collectionOf({
                folders: [
                    {
                        name: 'Environments',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [requestOf('Dentro')],
                    },
                ],
                items: [
                    requestOf('OpenCollection'),
                    requestOf('Folder'),
                    requestOf('Environments'),
                ],
            }),
            WORKSPACE,
        );

        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'environments-2/folder.yml',
            'environments-2/dentro.yml',
            'opencollection-2.yml',
            'folder-2.yml',
            'environments-3.yml',
        ]);
    });

    it('tells apart names that differ only by case', () => {
        const files = collectionFilesOf(
            collectionOf({ items: [requestOf('Lista'), requestOf('LISTA')] }),
            WORKSPACE,
        );

        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'lista.yml',
            'lista-2.yml',
        ]);
    });
});

describe('collectionFilesOf: folders at any depth', () => {
    it('numbers what a level holds as the person arranged it', () => {
        const files = collectionFilesOf(
            collectionOf({
                folders: [
                    {
                        name: 'F',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [],
                    },
                ],
                items: [requestOf('antes'), requestOf('despues')],
                sequence: ['item', 'folder', 'item'],
            }),
            WORKSPACE,
        );
        const seqOf = (path: string) => {
            const info = files.find((file) => file.path === path)?.document['info'];

            return (info as { seq: number } | undefined)?.seq;
        };

        expect(seqOf('antes.yml')).toBe(1);
        expect(seqOf('f/folder.yml')).toBe(2);
        expect(seqOf('despues.yml')).toBe(3);
    });

    it('keeps apart two folders of one name in different branches', () => {
        const hondo = (request: string) => ({
            name: 'Hondo',
            settings: { variables: [], headers: [] },
            folders: [],
            items: [requestOf(request)],
        });
        const files = collectionFilesOf(
            collectionOf({
                folders: [
                    {
                        name: 'A',
                        settings: { variables: [], headers: [] },
                        folders: [hondo('Uno')],
                        items: [],
                    },
                    {
                        name: 'B',
                        settings: { variables: [], headers: [] },
                        folders: [hondo('Dos')],
                        items: [],
                    },
                ],
            }),
            WORKSPACE,
        );

        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'a/folder.yml',
            'a/hondo/folder.yml',
            'a/hondo/uno.yml',
            'b/folder.yml',
            'b/hondo/folder.yml',
            'b/hondo/dos.yml',
        ]);
    });
});

describe('collectionFilesOf: environments', () => {
    it('carries the environments of the workspace', () => {
        const files = collectionFilesOf(collectionOf(), { ...WORKSPACE, environments: [PROD] });

        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'environments/prod.yml',
        ]);
    });
});
