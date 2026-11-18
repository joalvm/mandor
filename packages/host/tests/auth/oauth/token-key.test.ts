import { describe, expect, it } from 'vitest';

import { tokenKey, type TokenKeyInput } from '../../../src/auth/oauth/token-key.js';

const BASE: TokenKeyInput = {
    flow: 'oauth2-client-credentials',
    tokenUrl: 'https://idp.example/token',
    clientId: 'client',
    scope: 'read',
    audience: 'api',
    workspaceId: 'api-de-pagos',
    environmentId: 'staging',
};

describe('tokenKey', () => {
    it('is a sha256 in hex: a name safe to use as a file name', () => {
        expect(tokenKey(BASE)).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is the same for the same resolved fields', () => {
        expect(tokenKey({ ...BASE })).toBe(tokenKey(BASE));
    });

    it('changes with each field that makes a token a different token', () => {
        const others: Partial<TokenKeyInput>[] = [
            { flow: 'oauth2-code-pkce' },
            { tokenUrl: 'https://idp.example/other' },
            { clientId: 'other' },
            { scope: 'write' },
            { audience: 'other' },
            { workspaceId: 'otro' },
            { environmentId: 'prod' },
            { environmentId: null },
        ];

        for (const change of others) {
            expect(tokenKey({ ...BASE, ...change })).not.toBe(tokenKey(BASE));
        }
    });

    it('tells an absent scope from an empty one only if the file does: both mean none', () => {
        expect(tokenKey({ ...BASE, scope: undefined })).toBe(tokenKey({ ...BASE, scope: '' }));
    });

    it('does not let two fields blur into one by moving a separator', () => {
        expect(tokenKey({ ...BASE, clientId: 'a', scope: 'b c' })).not.toBe(
            tokenKey({ ...BASE, clientId: 'a b', scope: 'c' }),
        );
    });
});
