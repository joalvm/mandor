import { describe, expect, it } from 'vitest';

import type { CollectionItem } from '@mandor/schema';

import type { InteropDocument } from '../../src/ir/interop-document.js';
import { channelNameOf } from '../../src/workspace/channels-of-workspace.js';
import { workspaceToIr } from '../../src/workspace/workspace-to-interop.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';

function item(overrides: Partial<CollectionItem> = {}): CollectionItem {
    return {
        kind: 'message',
        name: 'registrarPedido',
        tags: [],
        body: { payload: '', payloadType: 'json' },
        ...overrides,
    };
}

function workspace(overrides: Partial<WorkspaceData> = {}): WorkspaceData {
    return {
        name: 'Pasarela',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections: [],

        ...overrides,
    };
}

describe('reading a workspace as the intermediate model', () => {
    it('answers an empty document for a workspace that holds nothing', () => {
        expect(workspaceToIr(workspace())).toEqual<InteropDocument>({
            name: 'Pasarela',
            sourceId: '',
            servers: [],
            security: {},
            channels: [],
            operations: [],
            defaultSecurity: [],
            payloadSchemas: {},
            notes: [],
            extras: {},
        });
    });

    it('turns every connection into the server its url speaks', () => {
        const ir = workspaceToIr(
            workspace({
                connections: [
                    {
                        id: 'produccion',
                        name: 'produccion',
                        transport: 'websocket',
                        url: 'wss://pasarela.ejemplo.com/v1',
                        headers: [],
                        environmentId: null,
                    },
                    {
                        id: 'tienda',
                        name: 'tienda',
                        transport: 'socketio',
                        url: 'https://tienda.ejemplo.com',
                        headers: [],
                        environmentId: null,
                    },
                ],
            }),
        );

        expect(ir.servers).toEqual([
            {
                name: 'produccion',
                url: 'wss://pasarela.ejemplo.com/v1',
                protocol: 'wss',
                security: [],
                variables: {},
                extras: {},
            },
            {
                name: 'tienda',
                url: 'https://tienda.ejemplo.com',
                protocol: 'socket.io',
                security: [],
                variables: {},
                extras: {},
            },
        ]);
    });

    it('gives every item of a folder the channel its own address names', () => {
        const ir = workspaceToIr(
            workspace({
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [
                            {
                                name: 'recibos',
                                settings: { variables: [], headers: [] },
                                folders: [],
                                items: [
                                    item({
                                        name: 'recibos/salientes',
                                        body: { channel: 'recibos/salientes' },
                                    }),
                                    item({
                                        name: 'avisos/salientes',
                                        body: { channel: 'avisos/salientes' },
                                    }),
                                ],
                            },
                        ],
                        items: [],
                    },
                ],
            }),
        );

        expect(ir.channels).toEqual([
            { name: 'recibos/salientes', address: 'recibos/salientes', extras: {} },
            { name: 'avisos/salientes', address: 'avisos/salientes', extras: {} },
        ]);
        expect(ir.operations.map((operation) => operation.channel)).toEqual([
            'recibos/salientes',
            'avisos/salientes',
        ]);
    });

    it('gives a top-level item a channel of its own', () => {
        const ir = workspaceToIr(
            workspace({
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [
                            item({
                                name: 'pedidoCreado',
                                body: { channel: '{{tenant}}.pedidos' },
                            }),
                        ],
                    },
                ],
            }),
        );

        expect(ir.channels).toEqual([
            { name: '{{tenant}}.pedidos', address: '{{tenant}}.pedidos', extras: {} },
        ]);
    });

    /** The channel an item answers for is the same the document turns into a channel. */
    it('answers the channel an item is named after: its address, or its name', () => {
        expect(
            channelNameOf(item({ name: 'recibos/salientes', body: { channel: '{{tenant}}' } })),
        ).toBe('{{tenant}}');
        expect(channelNameOf(item())).toBe('registrarPedido');
    });
});
