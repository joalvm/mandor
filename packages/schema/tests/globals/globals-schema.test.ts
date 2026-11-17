import { describe, expect, it } from 'vitest';

import { globalsSchema, parseGlobals } from '../../src/globals/globals-schema.js';

describe('the globals of an origin', () => {
    it('reads variables, secret ones included', () => {
        const variables = [
            { name: 'host', value: 'api.local', enabled: true, secret: false },
            { name: 'token', value: '', enabled: true, secret: true },
        ];

        expect(parseGlobals({ variables })).toEqual({ variables });
    });

    it('reads an empty file as an origin with no globals yet', () => {
        expect(parseGlobals(null)).toEqual({ variables: [] });
        expect(parseGlobals({})).toEqual({ variables: [] });
    });

    it('refuses a variable without a name', () => {
        expect(
            globalsSchema.safeParse({ variables: [{ value: 'x', enabled: true, secret: false }] })
                .success,
        ).toBe(false);
    });
});
