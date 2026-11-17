import { describe, expect, it } from 'vitest';

import { secretClearRequestSchema } from '../../src/secret/secret-clear.js';

describe('secretClearRequestSchema', () => {
    it('names the variable whose value is forgotten', () => {
        const request = { workspaceId: 'api-pagos', environmentId: 'prod', name: 'API_KEY' };

        expect(secretClearRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a name that could not sit inside {{...}}', () => {
        const base = { workspaceId: 'api-pagos', environmentId: 'prod' };

        expect(secretClearRequestSchema.safeParse({ ...base, name: 'a b' }).success).toBe(false);
        expect(secretClearRequestSchema.safeParse({ ...base, name: '$dynamic' }).success).toBe(
            false,
        );
    });

    it('refuses a request that names no environment', () => {
        const result = secretClearRequestSchema.safeParse({ workspaceId: 'api-pagos', name: 'k' });

        expect(result.success).toBe(false);
    });
});
