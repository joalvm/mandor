import { describe, expect, it } from 'vitest';

import { authTokenForgetRequestSchema } from '../../src/auth/auth-token-forget.js';

describe('authTokenForgetRequestSchema', () => {
    it('takes the same place as the status does', () => {
        const request = { workspaceId: 'api-pagos', environmentId: 'prod', parentPath: 'a/b' };

        expect(authTokenForgetRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a path made of anything but id segments', () => {
        expect(() =>
            authTokenForgetRequestSchema.parse({
                workspaceId: 'api-pagos',
                environmentId: null,
                parentPath: 'a//b',
            }),
        ).toThrow();
    });
});
