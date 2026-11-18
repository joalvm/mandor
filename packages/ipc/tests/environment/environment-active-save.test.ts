import { describe, expect, it } from 'vitest';

import { environmentActiveSaveRequestSchema } from '../../src/environment/environment-active-save.js';

describe('environmentActiveSaveRequestSchema', () => {
    it('names the environment chosen for a workspace', () => {
        const request = { workspaceId: 'api-pagos', environmentId: 'prod' };

        expect(environmentActiveSaveRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts null as no environment chosen', () => {
        const request = { workspaceId: 'api-pagos', environmentId: null };

        expect(environmentActiveSaveRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses an environment that is not an id', () => {
        const result = environmentActiveSaveRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            environmentId: 'Prod',
        });

        expect(result.success).toBe(false);
    });

    it('does not default the environment: choosing none has to be said', () => {
        expect(
            environmentActiveSaveRequestSchema.safeParse({ workspaceId: 'api-pagos' }).success,
        ).toBe(false);
    });
});
