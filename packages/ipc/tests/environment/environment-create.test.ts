import { describe, expect, it } from 'vitest';

import {
    environmentCreateRequestSchema,
    environmentCreateResultSchema,
} from '../../src/environment/environment-create.js';

describe('environmentCreateRequestSchema', () => {
    it('takes the workspace and the name the user typed', () => {
        const request = { workspaceId: 'api-pagos', name: 'Producción' };

        expect(environmentCreateRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a name made of whitespace only', () => {
        expect(
            environmentCreateRequestSchema.safeParse({ workspaceId: 'api-pagos', name: '   ' })
                .success,
        ).toBe(false);
    });
});

describe('environmentCreateResultSchema', () => {
    it('answers with the environment main wrote, id included', () => {
        const environment = { id: 'produccion', name: 'Producción', variables: [] };

        expect(environmentCreateResultSchema.parse({ ok: true, value: environment })).toEqual({
            ok: true,
            value: environment,
        });
    });

    it('refuses an environment with an id that is not an id', () => {
        const environment = { id: 'Producción', name: 'Producción', variables: [] };

        expect(
            environmentCreateResultSchema.safeParse({ ok: true, value: environment }).success,
        ).toBe(false);
    });

    it('answers a name that is already taken with its code', () => {
        const failure = { ok: false, error: { code: 'name-taken', message: 'taken' } };

        expect(environmentCreateResultSchema.parse(failure)).toEqual(failure);
    });
});
