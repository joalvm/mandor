import { describe, expect, it } from 'vitest';

import { workspaceToIr, type WorkspaceData } from '@mandor/interop-core';

import { irToDocument } from '../../../src/asyncapi/export/interop-to-document.js';

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

describe('the envelopes of the document the workspace describes', () => {
    it('writes the security the workspace kept, by name and from the outside in', () => {
        const ir = workspaceToIr(
            workspace({
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [
                            messageItem('registrarPedido', 'pedidos', 'incoming', {
                                security: ['token-portador'],
                            }),
                        ],
                    },
                ],
            }),
        );

        ir.security = { 'token-portador': { type: 'http', extras: { scheme: 'bearer' } } };

        const document = irToDocument(ir);

        expect(document['components']).toMatchObject({
            securitySchemes: { 'token-portador': { type: 'http', scheme: 'bearer' } },
        });
        expect(document['operations']).toMatchObject({
            registrarPedido: {
                security: [{ $ref: '#/components/securitySchemes/token-portador' }],
            },
        });
    });

    it('rides the extras of the document and of its servers back where they came from', () => {
        const ir = workspaceToIr(
            workspace({ connections: [connection('produccion', 'wss://pasarela.ejemplo.com')] }),
        );

        ir.extras = { 'x-zona': 'eu-oeste' };

        const server = ir.servers[0];

        if (server !== undefined) {
            server.extras = { bindings: { ws: { bindingVersion: '0.1.0' } } };
        }

        const document = irToDocument(ir);

        expect(document['x-zona']).toBe('eu-oeste');
        expect(document['servers']).toMatchObject({
            produccion: { bindings: { ws: { bindingVersion: '0.1.0' } } },
        });
    });
});
