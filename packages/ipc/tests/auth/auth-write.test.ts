import { describe, expect, it } from 'vitest';

import { authWriteRequestSchema } from '../../src/auth/auth-write.js';

describe('authWriteRequestSchema', () => {
    it('accepts a scheme to write in the workspace', () => {
        const request = {
            workspaceId: 'api-pagos',
            auth: { type: 'basic', username: 'u', password: 'p' },
        };

        expect(authWriteRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts null as the write that takes the key out', () => {
        expect(authWriteRequestSchema.parse({ workspaceId: 'api-pagos', auth: null })).toEqual({
            workspaceId: 'api-pagos',
            auth: null,
        });
    });

    it('refuses an auth the schema does not know', () => {
        expect(() =>
            authWriteRequestSchema.parse({ workspaceId: 'api-pagos', auth: { type: 'oauth2' } }),
        ).toThrow();
    });

    it('refuses a folder: its auth is a setting of the folder', () => {
        expect(() =>
            authWriteRequestSchema.parse({
                workspaceId: 'api-pagos',
                place: { kind: 'folder', path: 'pedidos' },
                auth: null,
            }),
        ).toThrow();
    });
});
