import { describe, expect, it } from 'vitest';

import {
    secretRevealRequestSchema,
    secretRevealResultSchema,
} from '../../src/secret/secret-reveal.js';

describe('secretRevealRequestSchema', () => {
    it('asks for one secret, by name', () => {
        const request = { workspaceId: 'api-pagos', environmentId: 'prod', name: 'API_KEY' };

        expect(secretRevealRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a request that names no variable', () => {
        const result = secretRevealRequestSchema.safeParse({
            workspaceId: 'api-pagos',
            environmentId: 'prod',
        });

        expect(result.success).toBe(false);
    });
});

describe('secretRevealResultSchema', () => {
    it('answers with the value of the one secret that was asked for', () => {
        const answer = { ok: true, value: { value: 's3cret' } };

        expect(secretRevealResultSchema.parse(answer)).toEqual(answer);
    });

    it('answers a variable with no value on this machine with null, which is not a refusal', () => {
        const answer = { ok: true, value: { value: null } };

        expect(secretRevealResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a value that travels with anything else', () => {
        const answer = { ok: true, value: { value: 'x', name: 'API_KEY' } };

        expect(secretRevealResultSchema.safeParse(answer).success).toBe(false);
    });

    it('refuses a value that is not text', () => {
        expect(secretRevealResultSchema.safeParse({ ok: true, value: { value: 7 } }).success).toBe(
            false,
        );
    });
});
