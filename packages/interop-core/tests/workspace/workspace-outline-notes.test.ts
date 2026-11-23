import type { Connection, Variable } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type { UnkeptLevels } from '../../src/workspace/unkept-parts.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';
import { outlineNodeSchema, workspaceOutline } from '../../src/workspace/workspace-outline.js';

const EMPTY_LEVEL = { settings: { variables: [], headers: [] }, folders: [], items: [] };

const DATA: WorkspaceData = {
    name: 'Pasarela',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [],
};

const OFF: Variable = { name: 'a', value: '1', enabled: false, secret: false };

describe('the notes of the outline', () => {
    it('notes on a level what the format does not keep of it, and is still written', () => {
        const held: WorkspaceData = {
            ...DATA,
            collections: [
                {
                    name: 'API',
                    settings: { description: 'doc', variables: [], headers: [] },
                    items: [],
                    folders: [
                        {
                            name: 'A',
                            settings: { description: 'doc', variables: [], headers: [] },
                            folders: [],
                            items: [],
                        },
                    ],
                },
            ],
        };
        const nodes = workspaceOutline(
            held,
            {},
            {
                collection: { description: 'authMovedDown' },
                folder: { description: 'foldersFlattened' },
            },
        );
        const collection = nodes.find((node) => node.kind === 'collection');

        expect(collection?.unkept).toEqual(['authMovedDown']);
        expect(collection?.children[0]?.unkept).toEqual(['foldersFlattened']);
        expect(collection?.reason).toBeUndefined();
        expect(outlineNodeSchema.safeParse(collection).success).toBe(true);
    });

    it('says where the connections go, only when several collections could hold them', () => {
        const rules: UnkeptLevels = {
            collection: {},
            folder: {},
            connections: 'connectionsInFirstCollection',
        };
        const connection = { id: 'c', name: 'C', transport: 'websocket' } as Connection;
        const noteOf = (collections: WorkspaceData['collections']) =>
            workspaceOutline({ ...DATA, connections: [connection], collections }, {}, rules).find(
                (node) => node.kind === 'connection',
            )?.unkept;

        expect(noteOf([{ name: 'Una', ...EMPTY_LEVEL }])).toBeUndefined();
        expect(
            noteOf([
                { name: 'Una', ...EMPTY_LEVEL },
                { name: 'Otra', ...EMPTY_LEVEL },
            ]),
        ).toEqual(['connectionsInFirstCollection']);
    });

    it('notes an environment or the globals with a variable off, where a format loses it', () => {
        const held: WorkspaceData = {
            ...DATA,
            environments: [
                { id: 'off', name: 'Off', variables: [OFF] },
                { id: 'on', name: 'On', variables: [{ ...OFF, enabled: true }] },
            ],
            globals: [OFF],
        };
        const rules: UnkeptLevels = {
            collection: {},
            folder: {},
            environments: 'disabledVariablesDropped',
        };
        const notes = workspaceOutline(held, {}, rules).map((node) => [node.kind, node.unkept]);

        expect(notes).toEqual([
            ['settings', ['disabledVariablesDropped']],
            ['environment', ['disabledVariablesDropped']],
            ['environment', undefined],
        ]);
        expect(workspaceOutline(held, {}).every((node) => node.unkept === undefined)).toBe(true);
    });

    it('notes a connection with a query parameter off, where a format loses it', () => {
        const rules: UnkeptLevels = {
            collection: {},
            folder: {},
            connectionQueryOff: 'connectionQueryOffDropped',
        };
        const line = { key: 'a', value: '1', enabled: false };
        const connection = { id: 'c', name: 'C', transport: 'websocket' } as Connection;
        const noteOf = (params: Connection['params']) =>
            workspaceOutline({ ...DATA, connections: [{ ...connection, params }] }, {}, rules)[0]
                ?.unkept;

        expect(noteOf(undefined)).toBeUndefined();
        expect(noteOf([{ ...line, enabled: true }])).toBeUndefined();
        expect(noteOf([line])).toEqual(['connectionQueryOffDropped']);
    });

    it('bars a message only when the format needs a connection and none is written', () => {
        const rules: UnkeptLevels = {
            collection: {},
            folder: {},
            messagesNeedConnection: 'messagesNeedConnection',
        };
        const message = { kind: 'message', name: 'Ping', tags: [], body: {} };
        const held = { ...DATA, collections: [{ name: 'A', ...EMPTY_LEVEL, items: [message] }] };
        const reasonOf = (data: WorkspaceData) =>
            workspaceOutline(data, {}, rules).find((node) => node.kind === 'collection')
                ?.children[0]?.reason;
        const socketio = { id: 'c', name: 'C', transport: 'socketio' } as Connection;
        const websocket = { ...socketio, transport: 'websocket' } as Connection;

        expect(reasonOf(held)).toBe('messagesNeedConnection');
        expect(reasonOf({ ...held, connections: [socketio] })).toBe('messagesNeedConnection');
        expect(reasonOf({ ...held, connections: [websocket] })).toBeUndefined();
    });

    it('lists what hangs from a level in the order the person arranged it', () => {
        const held: WorkspaceData = {
            ...DATA,
            collections: [
                {
                    name: 'API',
                    ...EMPTY_LEVEL,
                    sequence: ['item', 'folder', 'item'],
                    folders: [{ name: 'Carpeta', ...EMPTY_LEVEL }],
                    items: [
                        { kind: 'request', name: 'Uno', tags: [], body: {} },
                        { kind: 'request', name: 'Dos', tags: [], body: {} },
                    ],
                },
            ],
        };
        const [collection] = workspaceOutline(held, {});

        expect(collection?.children.map(({ label }) => label)).toEqual(['Uno', 'Carpeta', 'Dos']);
    });

    it('notes the row of an item, and the scripts its level loses', () => {
        const scripts = { onResponse: { source: 'a();' } };
        const held: WorkspaceData = {
            ...DATA,
            collections: [
                {
                    name: 'API',
                    settings: { variables: [], headers: [], scripts },
                    folders: [],
                    items: [{ kind: 'request', name: 'Pide', tags: ['a'], body: {} }],
                },
            ],
        };
        const [collection] = workspaceOutline(
            held,
            {},
            {
                collection: {},
                folder: {},
                writesScripts: false,
                request: { tags: 'tagsDropped' },
            },
        );

        expect(collection?.unkept).toEqual(['scriptsNotCarried']);
        expect(collection?.children[0]?.unkept).toEqual(['tagsDropped']);
        expect(outlineNodeSchema.safeParse(collection).success).toBe(true);
    });

    it('says where a message goes only when several connections could hold it', () => {
        const socket = { id: 'c', name: 'C', transport: 'websocket' } as Connection;
        const held = (connections: Connection[]): WorkspaceData => ({
            ...DATA,
            connections,
            collections: [
                {
                    name: 'API',
                    ...EMPTY_LEVEL,
                    items: [{ kind: 'message', name: 'Saluda', tags: [], body: { channel: 'x' } }],
                },
            ],
        });
        const rules: UnkeptLevels = {
            collection: {},
            folder: {},
            message: { byName: 'messagesInConnectionOfName', details: 'messageDetailsDropped' },
        };
        const noteOf = (connections: Connection[]) =>
            workspaceOutline(held(connections), {}, rules).find(
                (node) => node.kind === 'collection',
            )?.children[0]?.unkept;

        expect(noteOf([socket])).toEqual(['messageDetailsDropped']);
        expect(noteOf([socket, { ...socket, id: 'd', name: 'D' }])).toEqual([
            'messagesInConnectionOfName',
            'messageDetailsDropped',
        ]);
    });
});
