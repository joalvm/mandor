import type { CollectionItem, Connection, Environment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { collectionId, folderId, itemId } from '../../src/workspace/outline-ids.js';
import { selectWorkspaceData } from '../../src/workspace/select-workspace-data.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';
import { workspaceOutline } from '../../src/workspace/workspace-outline.js';

function item(name: string): CollectionItem {
    return { kind: 'message', name, tags: [], body: {} };
}

function connection(id: string): Connection {
    return {
        id,
        name: id,
        transport: 'websocket',
        url: 'wss://a.example',
        headers: [],
        environmentId: null,
    };
}

function environment(id: string): Environment {
    return { id, name: id, variables: [] };
}

const AUTH = { type: 'bearer', token: 'abc' } as const;

const NO_SETTINGS = { variables: [], headers: [] };

const DATA: WorkspaceData = {
    name: 'Pasarela',
    auth: AUTH,
    connections: [connection('produccion'), connection('pruebas')],
    environments: [environment('staging'), environment('local')],
    globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
    docs: [
        { name: 'leeme.md', title: 'Leeme', text: '# Pasarela' },
        { name: 'notas.md', title: 'Notas', text: 'Notas' },
    ],
    collections: [
        {
            name: 'Tienda',
            settings: { description: 'Lo que se vende', variables: [], auth: AUTH, headers: [] },
            folders: [
                {
                    name: 'pedidos',
                    settings: { variables: [], auth: AUTH, headers: [] },
                    folders: [],
                    items: [item('registrar'), item('cancelar')],
                },
                {
                    name: 'pagos',
                    settings: NO_SETTINGS,
                    folders: [
                        {
                            name: 'hondo',
                            settings: { description: 'Lo hondo', variables: [], headers: [] },
                            folders: [
                                {
                                    name: 'mas-hondo',
                                    settings: NO_SETTINGS,
                                    folders: [],
                                    items: [item('anular')],
                                },
                                { name: 'vacia', settings: NO_SETTINGS, folders: [], items: [] },
                            ],
                            items: [],
                        },
                        {
                            name: 'hermana',
                            settings: NO_SETTINGS,
                            folders: [],
                            items: [item('otra')],
                        },
                    ],
                    items: [item('cobrar')],
                },
            ],
            items: [item('salud'), item('version')],
        },
        { name: 'Vacia', settings: { variables: [], headers: [] }, folders: [], items: [] },
    ],
};

function inWorkspace(chosen: ReadonlySet<string>): WorkspaceData {
    return selectWorkspaceData(DATA, chosen, 'workspace');
}

describe('a workspace cut down to what was chosen', () => {
    it('keeps every node when every leaf is chosen', () => {
        const everything = new Set([
            'settings',
            'doc/leeme.md',
            'doc/notas.md',
            'connection/produccion',
            'connection/pruebas',
            'environment/staging',
            'environment/local',
            'collection/0/folder/0/item/0',
            'collection/0/folder/0/item/1',
            'collection/0/folder/1/folder/0/folder/0/item/0',
            'collection/0/folder/1/folder/0/folder/1',
            'collection/0/folder/1/folder/1/item/0',
            'collection/0/folder/1/item/0',
            'collection/0/item/0',
            'collection/0/item/1',
            'collection/1',
        ]);

        expect(inWorkspace(everything)).toEqual(DATA);
    });

    it('drops the connections and the environments that were not chosen', () => {
        const cut = inWorkspace(new Set(['connection/pruebas', 'environment/staging']));

        expect(cut.connections.map((each) => each.id)).toEqual(['pruebas']);
        expect(cut.environments.map((each) => each.id)).toEqual(['staging']);
        expect(cut.collections).toEqual([]);
    });

    it('drops a folder with no item chosen, and keeps the auth of the one that stays', () => {
        const cut = inWorkspace(new Set(['collection/0/folder/0/item/1']));
        const [collection] = cut.collections;

        expect(collection?.folders).toEqual([
            {
                name: 'pedidos',
                settings: { variables: [], auth: AUTH, headers: [] },
                folders: [],
                items: [item('cancelar')],
            },
        ]);
        expect(collection?.items).toEqual([]);
    });

    it('keeps what a collection says of itself while any item under it is chosen', () => {
        const cut = inWorkspace(new Set(['collection/0/item/1']));

        expect(cut.collections).toEqual([
            {
                name: 'Tienda',
                settings: {
                    description: 'Lo que se vende',
                    variables: [],
                    auth: AUTH,
                    headers: [],
                },
                folders: [],
                items: [item('version')],
            },
        ]);
    });

    it('takes a deep folder with its ancestors, what they declare included, and without their other children', () => {
        const cut = inWorkspace(new Set(['collection/0/folder/1/folder/0/folder/0/item/0']));

        expect(cut.collections[0]?.settings.description).toBe('Lo que se vende');
        expect(cut.collections[0]?.folders).toEqual([
            {
                name: 'pagos',
                settings: NO_SETTINGS,
                folders: [
                    {
                        name: 'hondo',
                        settings: { description: 'Lo hondo', variables: [], headers: [] },
                        folders: [
                            {
                                name: 'mas-hondo',
                                settings: NO_SETTINGS,
                                folders: [],
                                items: [item('anular')],
                            },
                        ],
                        items: [],
                    },
                ],
                items: [],
            },
        ]);
    });

    it('keeps an empty folder chosen by itself, and its ancestors with it', () => {
        const cut = inWorkspace(new Set(['collection/0/folder/1/folder/0/folder/1']));
        const pagos = cut.collections[0]?.folders[0];

        expect(pagos?.folders[0]?.folders.map((each) => each.name)).toEqual(['vacia']);
    });

    it('drops a collection nothing under it is chosen from, and keeps an empty one chosen by itself', () => {
        expect(inWorkspace(new Set()).collections).toEqual([]);
        expect(inWorkspace(new Set(['collection/1'])).collections.map((each) => each.name)).toEqual(
            ['Vacia'],
        );
    });

    it('keeps the name of the workspace, whatever was chosen', () => {
        expect(inWorkspace(new Set()).name).toBe('Pasarela');
    });

    it('takes the auth and the variables of the workspace together, and only when chosen', () => {
        const left = inWorkspace(new Set());
        const taken = inWorkspace(new Set(['settings']));

        expect([left.auth, left.globals]).toEqual([undefined, []]);
        expect([taken.auth, taken.globals]).toEqual([AUTH, DATA.globals]);
    });

    it('drops the notes that were not chosen', () => {
        const cut = inWorkspace(new Set(['doc/notas.md']));

        expect(cut.docs.map((doc) => doc.name)).toEqual(['notas.md']);
    });

    it('does not touch the data it was handed', () => {
        inWorkspace(new Set(['collection/0/item/0']));

        expect(DATA.collections[0]?.items).toHaveLength(2);
    });

    it('reads the ids the outline hands out', () => {
        const leaves = workspaceOutline(DATA, {}).flatMap(function walk(node): string[] {
            return node.children.length === 0 ? [node.id] : node.children.flatMap(walk);
        });

        expect(inWorkspace(new Set(leaves))).toEqual(DATA);
    });

    it('offers nothing above the collections when the scope is a collection', () => {
        const cut = selectWorkspaceData(
            DATA,
            new Set(['connection/produccion', 'environment/staging', 'collection/0/item/0']),
            'collection',
        );

        expect(cut.connections).toEqual([]);
        expect(cut.environments).toEqual([]);
        expect(cut.docs).toEqual([]);
        expect(cut.collections.map((each) => each.name)).toEqual(['Tienda']);
    });

    it('keeps the arrangement of what stays', () => {
        const data: WorkspaceData = {
            name: 'Tienda',
            connections: [],
            environments: [],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'API',
                    settings: NO_SETTINGS,
                    folders: [
                        { name: 'F', settings: NO_SETTINGS, folders: [], items: [item('dentro')] },
                        { name: 'G', settings: NO_SETTINGS, folders: [], items: [item('fuera')] },
                    ],
                    items: [item('primera'), item('segunda')],
                    sequence: ['item', 'folder', 'folder', 'item'],
                },
            ],
        };
        const top = collectionId(0);
        const chosen = new Set([itemId(folderId(top, 0), 0), itemId(top, 1)]);
        const cut = selectWorkspaceData(data, chosen, 'workspace');

        expect(cut.collections[0]?.sequence).toEqual(['folder', 'item']);
    });
});
