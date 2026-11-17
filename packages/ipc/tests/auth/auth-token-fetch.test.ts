import { describe, expect, it } from 'vitest';

import { authTokenFetchRequestSchema } from '../../src/auth/auth-token-fetch.js';

describe('authTokenFetchRequestSchema', () => {
    it('takes the same place as the status does', () => {
        const request = { workspaceId: 'api-pagos', environmentId: null, parentPath: null };

        expect(authTokenFetchRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a request without the workspace', () => {
        expect(() =>
            authTokenFetchRequestSchema.parse({ environmentId: null, parentPath: null }),
        ).toThrow();
    });
});
