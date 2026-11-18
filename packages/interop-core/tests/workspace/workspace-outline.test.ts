import type { CollectionItem, Connection, Environment } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type { WorkspaceData } from '../../src/workspace/workspace-data.js';
import {
    outlineNodeSchema,
    workspaceOutline,
    type OutlineNode,
} from '../../src/workspace/workspace-outline.js';

function item(kind: string, name: string): CollectionItem {
    return { kind, name, tags: [], body: {} };
}

const CONNECTION = {
    id: 'produccion',
    name: 'Produccion',
    transport: 'websocket',
    url: 'wss://pasarela.ejemplo.com',
    headers: [],
    environmentId: null,
} as Connection;

const ENVIRONMENT: Environment = { id: 'staging', name: 'Staging', variables: [] };

const DATA: WorkspaceData = {
    name: 'Pasarela',
    connections: [CONNECTION],
    environments: [ENVIRONMENT],
    globals: [],
    docs: [],
    collections: [
        {
            name: 'Tienda',
            settings: { variables: [], headers: [] },
            folders: [
                {
                    name: 'pedidos',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [item('request', 'registrar')],
                },
            ],
            items: [item('message', 'avisar'), item('other-kind', 'raro')],
        },
    ],
};

const WITH_SETTINGS: WorkspaceData = {
    ...DATA,
    auth: { type: 'bearer', token: 'abc' },
    globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
    docs: [{ name: 'leeme.md', title: 'Todo sobre Pasarela', text: '# Pasarela' }],
};

describe('the outline of a workspace', () => {
    it('lists the connections, the environments and the collections, in that order', () => {
        const nodes = workspaceOutline(DATA, {});

        expect(nodes.map((node) => [node.kind, node.label])).toEqual([
            ['connection', 'Produccion'],
            ['environment', 'Staging'],
            ['collection', 'Tienda'],
        ]);
    });

    it('hangs the folders and the top items under their collection, folders first', () => {
        const [, , collection] = workspaceOutline(DATA, {});

        expect(collection?.children.map((node) => [node.kind, node.label])).toEqual([
            ['folder', 'pedidos'],
            ['message', 'avisar'],
            ['other', 'raro'],
        ]);
        expect(collection?.children[0]?.children.map((node) => node.kind)).toEqual(['request']);
    });

    it('names each node by a route that holds up between the outline and the write', () => {
        const ids = workspaceOutline(DATA, {}).flatMap(function walk(node: OutlineNode): string[] {
            return [node.id, ...node.children.flatMap(walk)];
        });

        expect(ids).toEqual([
            'connection/produccion',
            'environment/staging',
            'collection/0',
            'collection/0/folder/0',
            'collection/0/folder/0/item/0',
            'collection/0/item/0',
            'collection/0/item/1',
        ]);
    });

    it('hangs a folder from its parent at any depth, each with a route of its own', () => {
        const hondo = {
            name: 'hondo',
            settings: { variables: [], headers: [] },
            folders: [],
            items: [],
        };
        const [collection] = workspaceOutline(
            {
                ...DATA,
                connections: [],
                environments: [],
                collections: [
                    {
                        name: 'Tienda',
                        settings: { variables: [], headers: [] },
                        folders: [
                            {
                                name: 'a',
                                settings: { variables: [], headers: [] },
                                folders: [hondo],
                                items: [],
                            },
                            {
                                name: 'b',
                                settings: { variables: [], headers: [] },
                                folders: [hondo],
                                items: [],
                            },
                        ],
                        items: [],
                    },
                ],
            },
            {},
        );

        expect(collection?.children.map((node) => node.children[0]?.id)).toEqual([
            'collection/0/folder/0/folder/0',
            'collection/0/folder/1/folder/0',
        ]);
        expect(collection?.children[0]?.children[0]).toMatchObject({
            kind: 'folder',
            label: 'hondo',
            children: [],
        });
    });

    it('bars, with the reason of the format, every node of a kind it does not write', () => {
        const nodes = workspaceOutline(DATA, {
            request: 'messagesNotHttp',
            message: 'noWebsocketMessages',
        });
        const [, , collection] = nodes;
        const folder = collection?.children[0];

        expect(folder?.children[0]?.reason).toBe('messagesNotHttp');
        expect(collection?.children[1]?.reason).toBe('noWebsocketMessages');
        expect(collection?.children[2]?.reason).toBeUndefined();
    });

    it('bars a folder and a collection when nothing under them can be written, without a reason of their own', () => {
        const nodes = workspaceOutline(DATA, {
            message: 'noWebsocketMessages',
            other: 'headersCopied',
            request: 'messagesNotHttp',
        });
        const [, , collection] = nodes;

        expect(collection?.reason).toBe('');
        expect(collection?.children[0]?.reason).toBe('');
    });

    it('leaves a branch free while anything under it is written', () => {
        const [, , collection] = workspaceOutline(DATA, { request: 'messagesNotHttp' });

        expect(collection?.reason).toBeUndefined();
        expect(collection?.children[0]?.reason).toBe('');
    });

    it('bars a connection and an environment by their kind as well', () => {
        const [connection, environment] = workspaceOutline(DATA, {
            connection: 'noConnections',
            environment: 'noVariables',
        });

        expect(connection?.reason).toBe('noConnections');
        expect(environment?.reason).toBe('noVariables');
    });

    it('tells a Socket.IO connection from a WebSocket one, and bars it with the connection reason', () => {
        const data = {
            ...DATA,
            connections: [CONNECTION, { ...CONNECTION, id: 'eventos', transport: 'socketio' }],
        } as WorkspaceData;
        const [websocket, socketio] = workspaceOutline(data, { connection: 'noConnections' });

        expect([websocket?.kind, socketio?.kind]).toEqual(['connection', 'socketio']);
        expect(socketio?.reason).toBe('noConnections');
    });

    it('lets a format bar Socket.IO alone while it writes the WebSocket connections', () => {
        const data = {
            ...DATA,
            connections: [CONNECTION, { ...CONNECTION, id: 'eventos', transport: 'socketio' }],
        } as WorkspaceData;
        const [websocket, socketio] = workspaceOutline(data, { socketio: 'noSocketio' });

        expect(websocket?.reason).toBeUndefined();
        expect(socketio?.reason).toBe('noSocketio');
    });

    it('is a shape the border accepts, with and without a reason', () => {
        const nodes = workspaceOutline(DATA, { request: 'messagesNotHttp' });

        expect(nodes.every((node) => outlineNodeSchema.safeParse(node).success)).toBe(true);
        expect(outlineNodeSchema.safeParse({ ...nodes[0], extra: 1 }).success).toBe(false);
    });

    it('puts the settings first and the notes last, when the workspace has them', () => {
        const nodes = workspaceOutline(WITH_SETTINGS, {});

        expect(nodes.map((node) => [node.kind, node.id])).toEqual([
            ['settings', 'settings'],
            ['connection', 'connection/produccion'],
            ['environment', 'environment/staging'],
            ['collection', 'collection/0'],
            ['doc', 'doc/leeme.md'],
        ]);
    });

    it('labels a note by its title, never by the extension of its file', () => {
        const nodes = workspaceOutline(WITH_SETTINGS, {});

        expect(nodes.at(-1)).toMatchObject({
            kind: 'doc',
            id: 'doc/leeme.md',
            label: 'Todo sobre Pasarela',
        });
    });

    it('offers no settings to a workspace with neither auth nor variables', () => {
        const kinds = workspaceOutline(DATA, {}).map((node) => node.kind);

        expect(kinds).not.toContain('settings');
    });

    it('bars the settings and the notes by their kind as well', () => {
        const nodes = workspaceOutline(WITH_SETTINGS, {
            doc: 'noWorkspaceNotes',
            settings: 'headersInEachOperation',
        });

        expect(nodes.at(0)?.reason).toBe('headersInEachOperation');
        expect(nodes.at(-1)?.reason).toBe('noWorkspaceNotes');
    });
});
