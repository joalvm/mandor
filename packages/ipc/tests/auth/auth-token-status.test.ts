import { describe, expect, it } from 'vitest';

import { authTokenRequestSchema, authTokenStatusSchema } from '../../src/auth/auth-token-status.js';

describe('authTokenRequestSchema', () => {
    it('names the workspace, the environment and the folder the level hangs from', () => {
        const request = {
            workspaceId: 'api-pagos',
            environmentId: 'staging',
            parentPath: 'pedidos',
        };

        expect(authTokenRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts no environment and the level as the editor holds it', () => {
        const request = {
            workspaceId: 'api-pagos',
            environmentId: null,
            own: {
                type: 'oauth2-client-credentials' as const,
                tokenUrl: 'https://idp.example.com/token',
                clientId: 'client',
                clientSecret: '{{secret}}',
                clientAuth: 'basic' as const,
            },
            parentPath: null,
        };

        expect(authTokenRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses an environment that is not an id', () => {
        expect(() =>
            authTokenRequestSchema.parse({
                workspaceId: 'api-pagos',
                environmentId: '../x',
                parentPath: null,
            }),
        ).toThrow();
    });
});

describe('authTokenStatusSchema', () => {
    it('describes a token by its state and when it stops', () => {
        const status = { state: 'valid', expiresAt: '2026-10-01T14:32:00.000Z' };

        expect(authTokenStatusSchema.parse(status)).toEqual(status);
    });

    it('has no room for the token itself', () => {
        expect(() =>
            authTokenStatusSchema.parse({ state: 'valid', expiresAt: null, accessToken: 'secret' }),
        ).toThrow();
    });

    it('refuses a state the window has no text for', () => {
        expect(() => authTokenStatusSchema.parse({ state: 'revoked', expiresAt: null })).toThrow();
    });
});
