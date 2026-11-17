import { describe, expect, it } from 'vitest';

import { workspaceToIr, type WorkspaceData } from '@mandor/interop-core';

import { irToDocument } from '../../../src/asyncapi/export/interop-to-document.js';

const TOTAL = '{"type":"object","properties":{"total":{"type":"number"}}}';

type ItemBody = { schema?: string; messageName?: string; security?: string[] };

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

function messageItem(name: string, channel: string, direction: string, extra: ItemBody = {}) {
    return {
        kind: 'message',
        name,
        tags: [],
        body: {
            channel,
            direction,
            payload: '',
            payloadType: 'json',
            ...extra,
        },
    };
}

function connection(name: string, url: string) {
    return {
        id: name,
        name,
        transport: 'websocket' as const,
        url,
        headers: [],
        environmentId: null,
    };
}

describe('writing the document the workspace describes', () => {
    it('flips the arrow back to the voice of the application described', () => {
        const ir = workspaceToIr(
            workspace({
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [
                            messageItem('registrarPedido', 'pedidos/entrantes', 'incoming'),
                            messageItem('recibirRecibo', 'recibos/salientes', 'outgoing'),
                        ],
                    },
                ],
            }),
        );
        const document = irToDocument(ir);

        expect(document['operations']).toMatchObject({
            registrarPedido: { action: 'send' },
            recibirRecibo: { action: 'receive' },
        });
    });

    it('keeps a schema one operation uses beside its channel, and a shared one in components', () => {
        const ir = workspaceToIr(
            workspace({
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [
                            messageItem('registrarPedido', 'pedidos/entrantes', 'incoming', {
                                schema: '{"type":"object"}',
                            }),
                            messageItem('recibirRecibo', 'recibos/salientes', 'outgoing', {
                                schema: TOTAL,
                                messageName: 'recibo',
                            }),
                            messageItem('notificarRecibo', 'avisos/salientes', 'outgoing', {
                                schema: TOTAL,
                                messageName: 'recibo',
                            }),
                        ],
                    },
                ],
            }),
        );
        const document = irToDocument(ir);
        const channels = document['channels'] as Record<string, Record<string, unknown>>;

        expect(channels['pedidos/entrantes']?.['messages']).toMatchObject({
            registrarPedido: { payload: { type: 'object' } },
        });
        expect(document['components']).toMatchObject({
            messages: { recibo: { payload: { type: 'object', properties: { total: {} } } } },
        });
        expect(channels['recibos/salientes']?.['messages']).toMatchObject({
            recibo: { $ref: '#/components/messages/recibo' },
        });
        expect(document['operations']).toMatchObject({
            registrarPedido: {
                messages: [{ $ref: '#/channels/pedidos~1entrantes/messages/registrarPedido' }],
            },
            recibirRecibo: {
                messages: [{ $ref: '#/channels/recibos~1salientes/messages/recibo' }],
            },
        });
    });

    it('splits the url of a server into the host and the pathname the format asks for', () => {
        const ir = workspaceToIr(
            workspace({
                connections: [connection('produccion', 'wss://pasarela.ejemplo.com:443/v1')],
            }),
        );
        const document = irToDocument(ir);

        expect(document['servers']).toMatchObject({
            produccion: { host: 'pasarela.ejemplo.com:443', pathname: '/v1', protocol: 'wss' },
        });
    });
});
