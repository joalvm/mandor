import { describe, expect, it } from 'vitest';

import { secretSetRequestSchema } from '../../src/secret/secret-set.js';

describe('secretSetRequestSchema', () => {
    const target = { workspaceId: 'api-pagos', environmentId: 'prod', name: 'API_KEY' };

    it('carries the value next to the variable it belongs to', () => {
        const request = { ...target, value: 's3cret' };

        expect(secretSetRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts an empty value: it is the user who decides what a secret holds', () => {
        expect(secretSetRequestSchema.safeParse({ ...target, value: '' }).success).toBe(true);
    });

    it('refuses a request with no value', () => {
        expect(secretSetRequestSchema.safeParse(target).success).toBe(false);
    });

    it('refuses a value that is not text', () => {
        expect(secretSetRequestSchema.safeParse({ ...target, value: null }).success).toBe(false);
    });

    it('refuses a name that could not sit inside {{...}}', () => {
        expect(
            secretSetRequestSchema.safeParse({ ...target, name: '{a}', value: 'x' }).success,
        ).toBe(false);
    });
});
