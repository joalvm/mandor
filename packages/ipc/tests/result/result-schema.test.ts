import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { emptyResultSchema, resultSchema } from '../../src/result/result-schema.js';

const REFUSAL = { ok: false, error: { code: 'conflict-open', message: 'open' } };

describe('the answer schema of a channel', () => {
    it('takes the value its channel promises, or a refusal with a known code', () => {
        const answer = resultSchema(z.string());

        expect(answer.parse({ ok: true, value: 'renamed' })).toEqual({
            ok: true,
            value: 'renamed',
        });
        expect(answer.parse(REFUSAL)).toEqual(REFUSAL);
        expect(answer.safeParse({ ok: true, value: 3 }).success).toBe(false);
        expect(
            answer.safeParse({ ok: false, error: { code: 'not-a-code', message: '' } }).success,
        ).toBe(false);
    });

    it('refuses what main added beyond the contract', () => {
        const answer = resultSchema(z.string());

        expect(answer.safeParse({ ok: true, value: 'x', extra: 1 }).success).toBe(false);
        expect(answer.safeParse({ ...REFUSAL, stack: 'at main' }).success).toBe(false);
    });
});

describe('the answer of a call that gives nothing back', () => {
    it('is an empty value or a refusal', () => {
        expect(emptyResultSchema.parse({ ok: true, value: {} })).toEqual({ ok: true, value: {} });
        expect(emptyResultSchema.parse(REFUSAL)).toEqual(REFUSAL);
    });

    it('refuses a value that carries something', () => {
        expect(emptyResultSchema.safeParse({ ok: true, value: { id: 'x' } }).success).toBe(false);
    });
});
