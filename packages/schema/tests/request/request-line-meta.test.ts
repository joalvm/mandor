import { describe, expect, it } from 'vitest';

import { KEY_VALUE_TYPES, keyValueMetaSchema } from '../../src/request/request-line-meta.js';

describe('what a pair promises about itself', () => {
    it('names the four JSON types a pair can be, as the send reads them', () => {
        expect([...KEY_VALUE_TYPES]).toEqual(['boolean', 'integer', 'number', 'string']);
    });

    it('takes a pair that says nothing: every promise is optional', () => {
        expect(keyValueMetaSchema.parse({})).toEqual({});
    });

    it('keeps the bounds, the default and the enum as the text the user wrote', () => {
        const meta = {
            default: '10',
            deprecated: true,
            enumValues: '1, 10, 100',
            max: '100',
            min: '1',
            required: true,
            type: 'integer',
        };

        expect(keyValueMetaSchema.parse(meta)).toEqual(meta);
    });

    it('refuses a type that is not one of the four', () => {
        expect(keyValueMetaSchema.safeParse({ type: 'date' }).success).toBe(false);
    });

    it('refuses a bound written as a number: the table keeps what was typed', () => {
        expect(keyValueMetaSchema.safeParse({ min: 1 }).success).toBe(false);
    });

    it('drops what the schema does not know instead of carrying it to the disk', () => {
        expect(keyValueMetaSchema.parse({ type: 'string', note: 'x' })).toEqual({
            type: 'string',
        });
    });
});
