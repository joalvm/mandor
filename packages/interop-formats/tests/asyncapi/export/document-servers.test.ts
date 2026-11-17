import { describe, expect, it } from 'vitest';

import { serversOfDocument } from '../../../src/asyncapi/export/document-servers.js';

describe('writing the servers of the document', () => {
    it('splits the url the runtime reads into host and pathname', () => {
        const servers = serversOfDocument([
            {
                name: 'produccion',
                url: 'wss://pasarela.ejemplo.com:443/v1',
                protocol: 'wss',
                security: [],
                variables: {},
                extras: {},
            },
        ]);

        expect(servers).toEqual({
            produccion: { host: 'pasarela.ejemplo.com:443', pathname: '/v1', protocol: 'wss' },
        });
    });

    it('points at the schemes by name, and rides the extras back', () => {
        const servers = serversOfDocument([
            {
                name: 'principal',
                url: 'ws://almacen.ejemplo.com',
                protocol: 'ws',
                security: ['token'],
                variables: {},
                extras: { bindings: { ws: { bindingVersion: '0.1.0' } } },
            },
        ]);

        expect(servers['principal']).toEqual({
            host: 'almacen.ejemplo.com',
            protocol: 'ws',
            security: [{ $ref: '#/components/securitySchemes/token' }],
            bindings: { ws: { bindingVersion: '0.1.0' } },
        });
    });

    it('keeps a url nobody can read as the host, and the document still names it', () => {
        const servers = serversOfDocument([
            {
                name: 'colas',
                url: 'sin-esquema',
                protocol: 'mqtt',
                security: [],
                variables: {},
                extras: {},
            },
        ]);

        expect(servers['colas']).toEqual({ host: 'sin-esquema', protocol: 'mqtt' });
    });
});
