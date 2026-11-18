import { describe, expect, it } from 'vitest';

import type { CollectionItem } from '@mandor/schema';

import { workspaceToIr } from '../../src/workspace/workspace-to-interop.js';

function item(overrides: Partial<CollectionItem> = {}): CollectionItem {
    return {
        kind: 'message',
        name: 'registrarPedido',
        tags: [],
        body: { payload: '', payloadType: 'json' },
        ...overrides,
    };
}

function operationsOf(items: CollectionItem[]): ReturnType<typeof workspaceToIr>['operations'] {
    return workspaceToIr({
        name: 'Pasarela',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections: [
            { name: 'Pasarela', settings: { variables: [], headers: [] }, folders: [], items },
        ],
    }).operations;
}

describe('reading a message item as the operation it is', () => {
    it('carries the direction the import wrote, and defaults to what Mandor sends', () => {
        const operations = operationsOf([item({ body: { direction: 'incoming' } }), item()]);

        expect(operations.map((operation) => operation.direction)).toEqual([
            'incoming',
            'outgoing',
        ]);
    });

    it('keeps the loose keys of the body as extras of the message, addressed keys aside', () => {
        const operations = operationsOf([
            item({
                body: {
                    channel: 'pedidos/entrantes',
                    payload: '{"id":"1"}',
                    payloadType: 'json',
                    description: 'Un pedido recién creado',
                    $ref: '#/channels/pedidos/messages/pedido',
                    contentType: 'application/json',
                    expectAck: { enabled: true, timeoutMs: 1_000 },
                },
            }),
        ]);
        const message = operations[0]?.message;

        expect(message).toMatchObject({
            payload: '{"id":"1"}',
            examples: ['{"id":"1"}'],
            extras: {
                description: 'Un pedido recién creado',
                contentType: 'application/json',
            },
        });
        expect(message?.extras).not.toHaveProperty('$ref');
    });

    it('registers the embedded schema under the name the message answers to', () => {
        const ir = workspaceToIr({
            name: 'Pasarela',
            connections: [],
            environments: [],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'Pasarela',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [
                        item({
                            body: { messageName: 'pedido', schema: '{"type":"object"}' },
                        }),
                    ],
                },
            ],
        });

        expect(ir.operations[0]?.message?.payloadSchema).toBe('pedido');
        expect(ir.payloadSchemas['pedido']).toEqual({ text: '{"type":"object"}', extras: {} });
    });

    it('carries the tags of the item', () => {
        expect(operationsOf([item({ tags: ['beta'] })])[0]?.tags).toEqual(['beta']);
    });
});
