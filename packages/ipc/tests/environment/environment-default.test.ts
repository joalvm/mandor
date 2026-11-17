import { describe, expect, it } from 'vitest';

import {
    environmentDefaultLoadRequestSchema,
    environmentDefaultResultSchema,
    environmentDefaultSaveRequestSchema,
} from '../../src/environment/environment-default.js';

describe('the default environment of a workspace', () => {
    it('is asked for by workspace and answered as an id or none', () => {
        expect(environmentDefaultLoadRequestSchema.parse({ workspaceId: 'pagos' })).toEqual({
            workspaceId: 'pagos',
        });
        expect(
            environmentDefaultResultSchema.parse({ ok: true, value: { environmentId: null } }),
        ).toEqual({ ok: true, value: { environmentId: null } });
    });

    it('is set by id, taken away with null, and refuses anything else', () => {
        expect(
            environmentDefaultSaveRequestSchema.parse({
                workspaceId: 'pagos',
                environmentId: 'base',
            }),
        ).toEqual({ workspaceId: 'pagos', environmentId: 'base' });
        expect(
            environmentDefaultSaveRequestSchema.safeParse({
                workspaceId: 'pagos',
                environmentId: '',
            }).success,
        ).toBe(false);
    });
});
