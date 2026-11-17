import { degradation, importResourceSchema } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { resourceAt, resourcesOfFolder } from '../support/resources.js';

const LAYOUTS = ['oc', 'bru'] as const;
const STORE = 'tienda-de-mascotas';

describe.each(LAYOUTS)('readFiles: a WebSocket request in the layout "%s"', (layout) => {
    it('is a connection of the workspace with its address, headers, auth and notes', async () => {
        const connection = resourceAt(
            await resourcesOfFolder(layout),
            'connection',
            'pedidos-en-vivo',
        );

        expect(importResourceSchema.safeParse(connection).success).toBe(true);
        expect(connection).toMatchObject({
            name: 'Pedidos en vivo',
            fields: {
                transport: 'websocket',
                url: 'wss://api.tienda.test/pedidos?sala=1',
                headers: [
                    { key: 'X-Token', value: '{{token}}', enabled: true },
                    { key: 'X-Off', value: '1', enabled: false },
                ],
                websocket: { subprotocols: ['json', 'v2'] },
                description: 'Canal de pedidos.',
                auth: { type: 'bearer', token: '{{token}}' },
            },
        });
    });

    it('says what the request kept that Mandor has no place for', async () => {
        const connection = resourceAt(
            await resourcesOfFolder(layout),
            'connection',
            'pedidos-en-vivo',
        );

        expect(connection.degradations).toEqual([degradation('noPlaceRequest', { names: 'tags' })]);
    });

    it('leaves the messages it kept saved in the collection, beside where it hung', async () => {
        const resources = await resourcesOfFolder(layout);
        const greeting = resourceAt(resources, 'item', `${STORE}/pedidos-en-vivo-saludo`);
        const ping = resourceAt(resources, 'item', `${STORE}/pedidos-en-vivo-ping`);

        expect(greeting).toMatchObject({
            itemKind: 'message',
            name: 'Pedidos en vivo: Saludo',
            fields: { payload: '{"op":"hello"}', payloadType: 'json' },
        });
        expect(ping.fields).toEqual({ payload: 'ping', payloadType: 'text' });
    });
});
