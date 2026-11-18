import { describe, expect, it } from 'vitest';

import type { InteropServer } from '@mandor/interop-core';

import { serversOfDocument } from '../../../src/openapi/export/document-servers.js';

describe('the servers of the document', () => {
    it('speaks the url, the name as its description, and the variables it takes', () => {
        const server: InteropServer = {
            name: 'Local',
            url: 'http://127.0.0.1:{port}',
            protocol: 'http',
            security: [],
            variables: { port: { default: '5123' } },
            extras: {},
        };

        expect(serversOfDocument([server])).toEqual([
            {
                url: 'http://127.0.0.1:{port}',
                description: 'Local',
                variables: { port: { default: '5123' } },
            },
        ]);
    });

    it('names no variables for a server that takes none', () => {
        const server: InteropServer = {
            name: 'Produccion',
            url: 'https://api.tienda.ejemplo.com/v1',
            protocol: 'https',
            security: [],
            variables: {},
            extras: {},
        };

        expect(serversOfDocument([server])).toEqual([
            { url: 'https://api.tienda.ejemplo.com/v1', description: 'Produccion' },
        ]);
    });

    it('keeps the enum and the description a variable carries', () => {
        const server: InteropServer = {
            name: 'Produccion',
            url: '{scheme}://a.b',
            protocol: 'https',
            security: [],
            variables: {
                scheme: { default: 'https', enum: ['https', 'http'], description: 'el scheme' },
            },
            extras: {},
        };

        expect((serversOfDocument([server])[0] as Record<string, unknown>)['variables']).toEqual({
            scheme: { default: 'https', enum: ['https', 'http'], description: 'el scheme' },
        });
    });
});
