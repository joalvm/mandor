import type { CollectionItem, ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type {
    WorkspaceData,
    WorkspaceFolderNode,
    WorkspaceFolderSettings,
} from '../../src/workspace/workspace-data.js';
import { workspaceToIr } from '../../src/workspace/workspace-to-interop.js';

const NEAR: ConcreteAuth = { type: 'bearer', token: '' };
const NO_SETTINGS: WorkspaceFolderSettings = { variables: [], headers: [] };

function request(name: string): CollectionItem {
    return {
        kind: 'request',
        name,
        tags: [],
        body: { method: 'GET', url: `http://a.test/${name}` },
    };
}

function folder(name: string, parts: Partial<WorkspaceFolderNode> = {}): WorkspaceFolderNode {
    return { name, settings: NO_SETTINGS, folders: [], items: [], ...parts };
}

function workspace(...collections: WorkspaceFolderNode[]): WorkspaceData {
    return {
        name: 'Tienda',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections,
    };
}

const TREE = workspace(
    folder('API', {
        folders: [
            folder('A', {
                settings: { description: 'Lo de A', variables: [], auth: NEAR, headers: [] },
                folders: [folder('Hondo', { items: [request('de-a')] })],
            }),
            folder('B', {
                folders: [folder('Hondo', { items: [request('de-b')] })],
                items: [request('suelta')],
            }),
        ],
    }),
);

describe('the folders of a workspace as the intermediate model says them', () => {
    it('tags every request with its folder of the first level, however deep it hangs', () => {
        const tags = workspaceToIr(TREE).operations.map((each) => [each.name, each.http?.tags]);

        expect(tags).toEqual([
            ['de-a', ['A']],
            ['suelta', ['B']],
            ['de-b', ['B']],
        ]);
    });

    it('names one group per folder by its whole path, with what it says of itself', () => {
        const groups = workspaceToIr(TREE).groups;

        expect(groups?.map((group) => group.path)).toEqual([
            ['A'],
            ['A', 'Hondo'],
            ['B'],
            ['B', 'Hondo'],
        ]);
        expect(groups?.[0]).toEqual({
            path: ['A'],
            description: 'Lo de A',
            security: ['bearerAuth'],
            scripts: [],
            extras: {},
        });
        expect(groups?.[2]?.security).toBeNull();
        expect(groups?.[2]).not.toHaveProperty('description');
    });

    it('sends what the levels above a request declare, the closest and its own winning', () => {
        const headers = workspaceToIr(
            workspace(
                folder('API', {
                    settings: {
                        variables: [],
                        headers: [
                            { key: 'X-Coleccion', value: 'c', enabled: true },
                            { key: 'X-Nivel', value: 'c', enabled: true },
                            { key: 'X-Propia', value: 'c', enabled: true },
                        ],
                    },
                    items: [request('arriba')],
                    folders: [
                        folder('A', {
                            settings: {
                                variables: [],
                                headers: [{ key: 'X-Nivel', value: 'a', enabled: true }],
                            },
                            items: [
                                {
                                    ...request('dentro'),
                                    body: {
                                        method: 'GET',
                                        url: 'http://a.test/dentro',
                                        headers: [{ key: 'X-Propia', value: 'r', enabled: true }],
                                    },
                                },
                            ],
                        }),
                    ],
                }),
            ),
        ).operations.map((operation) => [
            operation.name,
            operation.http?.parameters.map((parameter) => parameter.name),
        ]);

        expect(headers).toEqual([
            ['dentro', ['X-Coleccion', 'X-Nivel', 'X-Propia']],
            ['arriba', ['X-Coleccion', 'X-Nivel', 'X-Propia']],
        ]);
    });

    it('tags every message with its folder of the first level, or its collection', () => {
        const message: CollectionItem = {
            kind: 'message',
            name: 'm',
            tags: [],
            body: { payload: '', payloadType: 'json' },
        };
        const groups = workspaceToIr(
            workspace(
                folder('API', {
                    items: [{ ...message, name: 'arriba' }],
                    folders: [
                        folder('A', {
                            folders: [folder('Hondo', { items: [{ ...message, name: 'hondo' }] })],
                        }),
                    ],
                }),
            ),
        ).operations.map((operation) => [operation.name, operation.group]);

        expect(groups).toEqual([
            ['hondo', 'A'],
            ['arriba', 'API'],
        ]);
    });

    it('works the auth a deep request inherits out on the way down', () => {
        const [deep, other] = workspaceToIr(TREE).operations;

        expect(deep?.name).toBe('de-a');
        expect(deep?.http?.security).toEqual(['bearerAuth']);
        expect(other?.http?.security).toBeNull();
    });

    it('names no scheme for a folder of a workspace with no HTTP', () => {
        const groups = workspaceToIr(
            workspace(
                folder('Uno', {
                    folders: [
                        folder('Sola', {
                            settings: { variables: [], auth: NEAR, headers: [] },
                        }),
                    ],
                }),
            ),
        ).groups;

        expect(groups?.[0]?.security).toEqual([]);
    });

    it('writes no groups for a workspace with no folders', () => {
        expect(workspaceToIr(workspace(folder('Uno')))).not.toHaveProperty('groups');
    });

    it('keeps apart two folders of one name in two collections, each with what it says', () => {
        const ir = workspaceToIr(
            workspace(
                folder('Tienda', {
                    folders: [
                        folder('Pedidos', {
                            settings: { ...NO_SETTINGS, description: 'De la tienda' },
                            items: [request('uno')],
                        }),
                    ],
                }),
                folder('Almacen', {
                    folders: [
                        folder('Pedidos', {
                            settings: { ...NO_SETTINGS, description: 'Del almacen' },
                            items: [request('dos')],
                        }),
                    ],
                }),
            ),
        );

        expect(ir.operations.map((operation) => operation.http?.tags)).toEqual([
            ['Pedidos'],
            ['Almacen / Pedidos'],
        ]);
        expect(ir.groups?.map(({ path, description }) => [path, description])).toEqual([
            [['Pedidos'], 'De la tienda'],
            [['Almacen / Pedidos'], 'Del almacen'],
        ]);
    });

    it('keeps a folder apart from the requests at the top of another collection', () => {
        const ir = workspaceToIr(
            workspace(
                folder('Pedidos', { items: [request('suelta')] }),
                folder('Almacen', {
                    folders: [folder('Pedidos', { items: [request('dentro')] })],
                }),
            ),
        );

        expect(ir.operations.map((operation) => operation.http?.tags)).toEqual([
            ['Pedidos'],
            ['Almacen / Pedidos'],
        ]);
    });
});
