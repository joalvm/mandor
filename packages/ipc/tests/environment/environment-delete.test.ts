import { describe, expect, it } from 'vitest';

import { environmentDeleteRequestSchema } from '../../src/environment/environment-delete.js';

describe('environmentDeleteRequestSchema', () => {
    it('names the workspace and the environment', () => {
        const request = { workspaceId: 'api-pagos', environmentId: 'prod' };

        expect(environmentDeleteRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses an environment that is not one id segment', () => {
        const result = environmentDeleteRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            environmentId: 'a/b',
        });

        expect(result.success).toBe(false);
    });

    it('refuses a request that names no environment', () => {
        expect(environmentDeleteRequestSchema.safeParse({ workspaceId: 'api-pagos' }).success).toBe(
            false,
        );
    });
});
