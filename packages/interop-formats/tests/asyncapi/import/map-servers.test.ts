import { describe, expect, it } from 'vitest';

import { rawNamed, serversOf } from '../../../src/asyncapi/import/map-servers.js';
import { parseAsyncapiDocument } from '../../../src/asyncapi/document/parse-asyncapi-document.js';

const document3 = JSON.stringify({
    asyncapi: '3.0.0',
    info: { title: 't', version: '1' },
    servers: {
        produccion: {
            host: 'pasarela.ejemplo.com:443',
            pathname: '/v1',
            protocol: 'wss',
            security: [{ type: 'http', scheme: 'bearer' }],
            bindings: { ws: { query: { token: '{{token}}' } } },
        },
    },
    channels: {},
});

describe('serversOf', () => {
    it('builds one connection per server, with the URL the parser resolved', async () => {
        const { document, raw } = await parseAsyncapiDocument(document3);
        const servers = serversOf(document, raw, {});

        expect(servers).toHaveLength(1);
        expect(servers[0]).toMatchObject({
            name: 'produccion',
            url: 'wss://pasarela.ejemplo.com:443/v1',
            protocol: 'wss',
        });
    });

    it('keeps what it does not map — the bindings ride along', async () => {
        const { document, raw } = await parseAsyncapiDocument(document3);

        expect(serversOf(document, raw, {})[0]?.extras['bindings']).toEqual({
            ws: { query: { token: '{{token}}' } },
        });
    });
});

describe('rawNamed', () => {
    it('reads a named entry with the spelling of the document', () => {
        expect(rawNamed({ servers: { prod: { host: 'x' } } }, 'servers', 'prod')).toEqual({
            host: 'x',
        });
    });

    it('answers nothing when the group, the name or the entry is missing or not an object', () => {
        expect(rawNamed({ servers: 'prod' }, 'servers', 'prod')).toBeUndefined();
        expect(rawNamed({ servers: { prod: {} } }, 'servers', undefined)).toBeUndefined();
        expect(rawNamed({ servers: { prod: 'wss://x' } }, 'servers', 'prod')).toBeUndefined();
    });
});
