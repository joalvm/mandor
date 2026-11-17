import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { websocketResourceOf } from '../../../src/bruno/import/websocket-connection.js';
import type { BrunoWebSocket } from '../../../src/bruno/document/bruno-tree.js';
import { rowOf, websocketNode } from '../support/trees.js';

const SOURCE = 'collection:c';

function resourceOf(overrides: Partial<BrunoWebSocket> = {}) {
    return websocketResourceOf(websocketNode(overrides), SOURCE, 'pedidos-en-vivo');
}

describe('websocketResourceOf', () => {
    it('is a connection of the workspace under its route, with the origin of the document', () => {
        const resource = resourceOf({ name: 'Pedidos en vivo' });

        expect(resource).toMatchObject({
            place: 'connection',
            itemKind: null,
            route: 'pedidos-en-vivo',
            name: 'Pedidos en vivo',
            origin: { kind: 'bruno', sourceId: SOURCE },
            degradations: [],
        });
        expect(importResourceSchema.safeParse(resource).success).toBe(true);
    });

    it('carries the address, the headers on and off, the notes and the auth of the request', () => {
        const resource = resourceOf({
            url: 'wss://api.test/live?room=1',
            description: 'El canal',
            headers: [rowOf('X-Token', '{{token}}'), rowOf('X-Off', '1', { disabled: true })],
            auth: { type: 'bearer', token: '{{token}}' },
        });

        expect(resource.fields).toMatchObject({
            transport: 'websocket',
            url: 'wss://api.test/live?room=1',
            description: 'El canal',
            headers: [
                { key: 'X-Token', value: '{{token}}', enabled: true },
                { key: 'X-Off', value: '1', enabled: false },
            ],
            auth: { type: 'bearer', token: '{{token}}' },
        });
    });

    it('offers the subprotocol header as the subprotocols of the handshake', () => {
        const resource = resourceOf({ headers: [rowOf('Sec-WebSocket-Protocol', 'chat, v2')] });

        expect(resource.fields).toMatchObject({ websocket: { subprotocols: ['chat', 'v2'] } });
        expect(resource.fields['headers']).toEqual([]);
    });

    it('says what the request keeps that Mandor has no place for, and the auth it cannot carry', () => {
        const resource = resourceOf({ auth: { type: 'digest' }, leftOut: ['scripts', 'tags'] });

        expect(resource.degradations).toEqual([
            degradation('authNoEquivalentRequest', { type: 'digest' }),
            degradation('noPlaceRequest', { names: 'scripts, tags' }),
        ]);
    });

    it('says so when the address is not one a WebSocket can dial', () => {
        expect(resourceOf({ url: 'https://api.test/live' }).degradations).toEqual([
            degradation('urlNotWebsocket', { url: 'https://api.test/live' }),
        ]);
    });
});
