import { describe, expect, it } from 'vitest';

import { secretKeptRequestSchema, secretKeptResultSchema } from '../../src/secret/secret-kept.js';

describe('secretKeptRequestSchema', () => {
    it('asks about one environment', () => {
        const request = { workspaceId: 'api-pagos', environmentId: 'prod' };

        expect(secretKeptRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses an environment that is not an id', () => {
        const result = secretKeptRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            environmentId: 'Prod',
        });

        expect(result.success).toBe(false);
    });
});

describe('secretKeptResultSchema', () => {
    it('answers with names, never with values', () => {
        const answer = { ok: true, value: ['API_KEY', 'token'] };

        expect(secretKeptResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a name that could not sit inside {{...}}', () => {
        expect(secretKeptResultSchema.safeParse({ ok: true, value: ['a b'] }).success).toBe(false);
    });

    it('refuses a success that carries values next to the names', () => {
        const answer = { ok: true, value: ['API_KEY'], secrets: { API_KEY: 'x' } };

        expect(secretKeptResultSchema.safeParse(answer).success).toBe(false);
    });

    it('answers a failure with a code', () => {
        const failure = { ok: false, error: { code: 'fs-read', message: 'gone' } };

        expect(secretKeptResultSchema.parse(failure)).toEqual(failure);
    });
});
