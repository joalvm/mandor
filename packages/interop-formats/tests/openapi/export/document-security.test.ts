import { describe, expect, it } from 'vitest';

import type { InteropDocument } from '@mandor/interop-core';

import { securityOfDocument } from '../../../src/openapi/export/document-security.js';

function document(overrides: Partial<InteropDocument> = {}): InteropDocument {
    return {
        name: 'Tienda',
        sourceId: '',
        servers: [],
        security: {},
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
        ...overrides,
    };
}

describe('the security of the document', () => {
    it('spreads the shape of every scheme under its name', () => {
        const ir = document({
            security: {
                bearerAuth: { type: 'http', extras: { scheme: 'bearer' } },
                apiKeyAuth: { type: 'apiKey', extras: { name: 'X-Key', in: 'header' } },
            },
        });

        expect(securityOfDocument(ir)).toEqual({
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer' },
                apiKeyAuth: { type: 'apiKey', name: 'X-Key', in: 'header' },
            },
        });
    });

    it('names the default security, one requirement per scheme', () => {
        const ir = document({
            security: { bearerAuth: { type: 'http', extras: { scheme: 'bearer' } } },
            defaultSecurity: ['bearerAuth'],
        });

        expect(securityOfDocument(ir)).toEqual({
            securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
            security: [{ bearerAuth: [] }],
        });
    });

    it('names the default even when no scheme of the document answers for it', () => {
        const ir = document({ security: {}, defaultSecurity: ['oauth2Externo'] });

        expect(securityOfDocument(ir)).toEqual({ security: [{ oauth2Externo: [] }] });
    });

    it('says nothing for a document without schemes and without a default', () => {
        expect(securityOfDocument(document())).toEqual({});
    });
});
