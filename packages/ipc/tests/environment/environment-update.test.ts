import { describe, expect, it } from 'vitest';

import {
    environmentUpdateRequestSchema,
    environmentUpdateResultSchema,
} from '../../src/environment/environment-update.js';

const TARGET = { workspaceId: 'api-pagos', environmentId: 'prod' };

describe('environmentUpdateRequestSchema', () => {
    it('accepts a new name alone', () => {
        const request = { ...TARGET, changes: { name: 'Producción' } };

        expect(environmentUpdateRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts new variables alone', () => {
        const variables = [{ name: 'token', value: '', enabled: true, secret: true }];
        const request = { ...TARGET, changes: { variables } };

        expect(environmentUpdateRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts no changes at all, which leaves the environment as it was', () => {
        expect(environmentUpdateRequestSchema.safeParse({ ...TARGET, changes: {} }).success).toBe(
            true,
        );
    });

    it('refuses a name made of whitespace only', () => {
        const request = { ...TARGET, changes: { name: '  ' } };

        expect(environmentUpdateRequestSchema.safeParse(request).success).toBe(false);
    });

    it('refuses a variable whose name has braces in it', () => {
        const variables = [{ name: 'a{b}', value: '', enabled: true, secret: false }];

        expect(
            environmentUpdateRequestSchema.safeParse({ ...TARGET, changes: { variables } }).success,
        ).toBe(false);
    });

    it('refuses a request with no changes key', () => {
        expect(environmentUpdateRequestSchema.safeParse(TARGET).success).toBe(false);
    });
});

describe('environmentUpdateResultSchema', () => {
    it('answers with the environment as it was left', () => {
        const environment = { id: 'prod', name: 'Producción', variables: [] };

        expect(environmentUpdateResultSchema.parse({ ok: true, value: environment })).toEqual({
            ok: true,
            value: environment,
        });
    });

    it('answers a missing environment with its code', () => {
        const failure = { ok: false, error: { code: 'not-found', message: 'gone' } };

        expect(environmentUpdateResultSchema.parse(failure)).toEqual(failure);
    });
});
