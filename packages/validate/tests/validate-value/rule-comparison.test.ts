import { describe, expect, it } from 'vitest';

import { comparisonOf } from '../../src/validate-value/rule-comparison.js';

describe('comparisonOf', () => {
    it('sets the types a rule asked against the type it got', () => {
        expect(
            comparisonOf({
                keyword: 'type',
                params: { expected: 'string, null', received: 'integer' },
            }),
        ).toEqual({ expected: 'string | null', received: 'integer' });
    });

    it('writes each bound with the sign of its rule, against what the value had', () => {
        const signs = [
            ['minimum', '≥'],
            ['maximum', '≤'],
            ['exclusiveMinimum', '>'],
            ['exclusiveMaximum', '<'],
            ['minLength', '≥'],
            ['maxLength', '≤'],
            ['minItems', '≥'],
            ['maxItems', '≤'],
            ['minProperties', '≥'],
            ['maxProperties', '≤'],
        ];

        for (const [keyword, sign] of signs) {
            expect(
                comparisonOf({ keyword: String(keyword), params: { actual: '2', limit: '3' } }),
            ).toEqual({ expected: `${String(sign)} 3`, received: '2' });
        }
    });

    it('writes the text a format or a pattern refused as JSON, the way the value shows it', () => {
        expect(
            comparisonOf({ keyword: 'format', params: { actual: 'ayer', format: 'date' } }),
        ).toEqual({ expected: 'date', received: '"ayer"' });
        expect(
            comparisonOf({ keyword: 'pattern', params: { actual: 'x1', pattern: '^[a-z]+$' } }),
        ).toEqual({ expected: '^[a-z]+$', received: '"x1"' });
        expect(comparisonOf({ keyword: 'format', params: { format: 'date' } })).toEqual({
            expected: 'date',
            received: undefined,
        });
    });

    it('leaves to the value what a constant or a list of allowed values got', () => {
        expect(comparisonOf({ keyword: 'const', params: { expected: '"on"' } })).toEqual({
            expected: '"on"',
        });
        expect(comparisonOf({ keyword: 'enum', params: { allowed: 'a, b' } })).toEqual({
            expected: 'a, b',
        });
    });

    it('has no pair for a rule said in words', () => {
        expect(comparisonOf({ keyword: 'required', params: { property: 'id' } })).toBeUndefined();
    });
});
