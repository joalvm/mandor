import { describe, expect, it } from 'vitest';

import {
    globalsReadRequestSchema,
    globalsReadResultSchema,
    globalsWriteRequestSchema,
} from '../../src/globals/globals-contract.js';

const TOKEN = { name: 'token', value: '', enabled: true, secret: true };

describe('the contract of the globals', () => {
    it('asks for the globals without naming a place', () => {
        expect(globalsReadRequestSchema.parse({})).toEqual({});
        expect(globalsReadRequestSchema.safeParse({ root: '/home' }).success).toBe(false);
    });

    it('answers the variables of the origin', () => {
        const answer = { ok: true, value: { variables: [TOKEN] } };

        expect(globalsReadResultSchema.parse(answer)).toEqual(answer);
    });

    it('writes a whole list and refuses one with a nameless variable', () => {
        expect(globalsWriteRequestSchema.parse({ globals: { variables: [TOKEN] } })).toEqual({
            globals: { variables: [TOKEN] },
        });
        expect(
            globalsWriteRequestSchema.safeParse({
                globals: { variables: [{ value: 'x', enabled: true, secret: false }] },
            }).success,
        ).toBe(false);
    });
});
