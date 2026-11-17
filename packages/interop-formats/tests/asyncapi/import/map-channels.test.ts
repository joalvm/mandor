import { describe, expect, it } from 'vitest';

import { channelsOf } from '../../../src/asyncapi/import/map-channels.js';
import { parseAsyncapiDocument } from '../../../src/asyncapi/document/parse-asyncapi-document.js';

const document3 = JSON.stringify({
    asyncapi: '3.0.0',
    info: { title: 't', version: '1' },
    channels: {
        pedidosEntrantes: {
            address: 'pedidos/entrantes',
            description: 'Pedidos que entran',
            'x-interno': { cola: 'primaria' },
        },
    },
});

describe('channelsOf', () => {
    it('keeps the name the document gave the channel and the address the wire uses', async () => {
        const { document, raw } = await parseAsyncapiDocument(document3);

        expect(channelsOf(document, raw)).toEqual([
            {
                name: 'pedidosEntrantes',
                address: 'pedidos/entrantes',
                description: 'Pedidos que entran',
                extras: { 'x-interno': { cola: 'primaria' } },
            },
        ]);
    });
});
