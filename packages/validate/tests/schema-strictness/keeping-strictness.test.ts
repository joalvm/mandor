import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import { keepingStrictness } from '../../src/schema-strictness/keeping-strictness.js';

const GENERATED = JSON.stringify({
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' } },
    required: ['id', 'name'],
});

describe('keepingStrictness', () => {
    it('closes the new objects when every old one was closed', () => {
        const previous = '{"properties": {"a": {}}, "unevaluatedProperties": false}';

        expect(parse(keepingStrictness(previous, GENERATED))).toMatchObject({
            unevaluatedProperties: false,
        });
    });

    it('leaves the new keys optional when the old schema required none of its keys', () => {
        const previous = '{"properties": {"a": {}}}';

        expect(parse(keepingStrictness(previous, GENERATED))).not.toHaveProperty('required');
    });

    it('keeps what the generation wrote when the old schema held no option for every object', () => {
        const previous = JSON.stringify({
            properties: { a: { properties: { b: {} }, unevaluatedProperties: false } },
            required: ['a'],
        });

        expect(keepingStrictness(previous, GENERATED)).toBe(GENERATED);
    });

    it('keeps what the generation wrote over an old schema with no key, or none it can read', () => {
        expect(keepingStrictness('{"type": "string"}', GENERATED)).toBe(GENERATED);
        expect(keepingStrictness('', GENERATED)).toBe(GENERATED);
    });
});
