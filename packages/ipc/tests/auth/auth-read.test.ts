import { describe, expect, it } from 'vitest';

import { authReadRequestSchema, placeAuthSchema } from '../../src/auth/auth-read.js';

describe('authReadRequestSchema', () => {
    it('asks for the workspace and nothing else', () => {
        expect(authReadRequestSchema.parse({ workspaceId: 'api-pagos' })).toEqual({
            workspaceId: 'api-pagos',
        });
    });

    it('refuses a folder: its auth is a setting of the folder', () => {
        expect(() =>
            authReadRequestSchema.parse({
                workspaceId: 'api-pagos',
                place: { kind: 'folder', path: 'pedidos' },
            }),
        ).toThrow();
    });
});

describe('placeAuthSchema', () => {
    it('accepts null as the auth nobody wrote', () => {
        expect(placeAuthSchema.parse({ auth: null })).toEqual({ auth: null });
    });

    it('accepts a whole auth scheme', () => {
        expect(placeAuthSchema.parse({ auth: { type: 'none' } })).toEqual({
            auth: { type: 'none' },
        });
    });
});
