import type { WorkspaceData } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/bruno/export/documents-of.js';
import {
    EVENTS,
    LOBBY,
    MASCOTAS,
    PROD,
    SYNC_WORKSPACE,
    requestOf,
} from '../support/sample-workspace.js';

function workspaceOf(overrides: Partial<WorkspaceData> = {}): WorkspaceData {
    return {
        name: 'Tienda',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections: [],
        ...overrides,
    };
}

describe('documentsOf', () => {
    it('writes a single collection at the root of what is saved', () => {
        const files = documentsOf(SYNC_WORKSPACE);

        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'admin/folder.yml',
            'admin/borrarmascota.yml',
            'listamascotas.yml',
            'environments/prod.yml',
        ]);
    });

    it('writes each of several collections in a directory named after it', () => {
        const files = documentsOf(
            workspaceOf({
                environments: [PROD],
                collections: [
                    MASCOTAS,
                    {
                        name: 'Pedidos',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [requestOf('Uno')],
                    },
                ],
            }),
        );

        expect(files.map((file) => file.path)).toEqual([
            'mascotas/opencollection.yml',
            'mascotas/admin/folder.yml',
            'mascotas/admin/borrarmascota.yml',
            'mascotas/listamascotas.yml',
            'mascotas/environments/prod.yml',
            'pedidos/opencollection.yml',
            'pedidos/uno.yml',
            'pedidos/environments/prod.yml',
        ]);
    });

    it('tells apart collections of one name', () => {
        const files = documentsOf(
            workspaceOf({
                collections: [
                    {
                        name: 'Tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [],
                    },
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [],
                    },
                ],
            }),
        );

        expect(files.map((file) => file.path)).toEqual([
            'tienda/opencollection.yml',
            'tienda-2/opencollection.yml',
        ]);
    });

    it('gives the environments and variables of a workspace with no collection one named after it', () => {
        const files = documentsOf(
            workspaceOf({
                name: 'Solo entornos',
                environments: [PROD],
                globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
            }),
        );

        expect(files.map((file) => file.path)).toEqual([
            'opencollection.yml',
            'environments/prod.yml',
        ]);
        expect(files[0]?.document).toMatchObject({
            info: { name: 'Solo entornos' },
            request: { variables: [{ name: 'region', value: 'eu' }] },
        });
    });

    it('writes nothing for a workspace that holds neither a collection nor an environment', () => {
        expect(documentsOf(workspaceOf())).toEqual([]);
    });

    it('puts the WebSocket connections of the workspace in the first collection only', () => {
        const files = documentsOf(
            workspaceOf({
                connections: [LOBBY],
                collections: [
                    MASCOTAS,
                    {
                        name: 'Pedidos',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [requestOf('Uno')],
                    },
                ],
            }),
        );

        expect(files.map((file) => file.path)).toEqual([
            'mascotas/opencollection.yml',
            'mascotas/admin/folder.yml',
            'mascotas/admin/borrarmascota.yml',
            'mascotas/listamascotas.yml',
            'mascotas/lobby.yml',
            'pedidos/opencollection.yml',
            'pedidos/uno.yml',
        ]);
    });

    it('gives the connections of a workspace with no collection one named after it', () => {
        const files = documentsOf(workspaceOf({ name: 'Solo canales', connections: [LOBBY] }));

        expect(files.map((file) => file.path)).toEqual(['opencollection.yml', 'lobby.yml']);
        expect(files[0]?.document).toMatchObject({ info: { name: 'Solo canales' } });
    });

    it('writes nothing for a workspace whose only connections are not WebSocket', () => {
        expect(documentsOf(workspaceOf({ connections: [EVENTS] }))).toEqual([]);
    });

    it('writes the messages of any collection inside the connection that keeps them', () => {
        const message = {
            kind: 'message',
            name: 'Lobby: ping',
            tags: [],
            body: { payload: '{}', payloadType: 'json' },
        };
        const files = documentsOf(
            workspaceOf({
                connections: [LOBBY],
                collections: [
                    { ...MASCOTAS, name: 'Una' },
                    { ...MASCOTAS, name: 'Otra', items: [...MASCOTAS.items, message] },
                ],
            }),
        );
        const socket = files.find((file) => file.path.endsWith('lobby.yml'));

        const { message: messages } = socket?.document['websocket'] as { message: unknown[] };

        expect(messages).toContainEqual({
            title: 'ping',
            message: { type: 'json', data: '{}' },
        });
    });
});
