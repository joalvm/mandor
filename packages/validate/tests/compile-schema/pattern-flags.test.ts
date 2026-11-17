import { describe, expect, it } from 'vitest';

import { compileSchema } from '../../src/compile-schema/compile-schema.js';
import { withPatternFlags } from '../../src/compile-schema/pattern-flags.js';
import type { CompiledSchema } from '../../src/compiled-schema/compiled-schema.js';
import { validateValue } from '../../src/validate-value/validate-value.js';

describe('the flags each pattern of a schema is read with', () => {
    /**
     * V8 hands a regex that backtracks too much to its linear engine, and that engine takes no
     * pattern read with `u`. A pattern that reads the same without it goes without it.
     */
    it('reads a pattern that needs nothing of unicode without the u flag', () => {
        expect(withPatternFlags({ type: 'string', pattern: '^([0-9a-f-]+)*x$' })).toEqual({
            type: 'string',
            pattern: '^([0-9a-f-]+)*x$',
            regexFlags: '',
        });
    });

    it.each(['^\\p{L}+$', '^\\P{N}$', '^\\u{1F600}$', '^😀+$'])(
        'keeps the u flag for the names %s matches, which mean something else without it',
        (name) => {
            expect(withPatternFlags({ patternProperties: { [name]: {} } })).toMatchObject({
                regexFlags: 'u',
            });
        },
    );

    it('reads the names patternProperties match with the same flags as the pattern beside them', () => {
        expect(
            withPatternFlags({ patternProperties: { '^\\p{L}$': {} }, pattern: '^x-' }),
        ).toMatchObject({ regexFlags: 'u' });
        expect(withPatternFlags({ patternProperties: { '^x-': {} } })).toMatchObject({
            regexFlags: '',
        });
    });

    it('reaches the patterns of every schema the schema holds', () => {
        const read = withPatternFlags({
            properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
            items: [{ pattern: '^a$' }],
            $defs: { name: { allOf: [{ patternProperties: { '^\\p{L}+$': {} } }] } },
        });

        expect(read).toMatchObject({
            properties: { id: { regexFlags: '' } },
            items: [{ regexFlags: '' }],
            $defs: { name: { allOf: [{ regexFlags: 'u' }] } },
        });
    });

    /** The names of an object are text too, and draft 7 still writes a dependency as a schema. */
    it('reaches the schema of the names of an object and of a dependency', () => {
        const read = withPatternFlags({
            propertyNames: { pattern: '^[a-z]+$' },
            dependencies: { card: { properties: { cvv: { pattern: '^[0-9]{3}$' } } }, a: ['b'] },
        });

        expect(read).toMatchObject({
            propertyNames: { regexFlags: '' },
            dependencies: { card: { properties: { cvv: { regexFlags: '' } } }, a: ['b'] },
        });
    });

    /** `g` or `y` keep where the last test stopped, and the same value would pass on every other check. */
    it('takes the choice of flags away from the schema that states its own', () => {
        expect(withPatternFlags({ pattern: '^a$', regexFlags: 'g' })).toEqual({
            pattern: '^a$',
            regexFlags: '',
        });
    });

    /** A `const` or an `example` is a value, and a value that names a pattern is still that value. */
    it('leaves the values a schema states as they were written', () => {
        const schema = { const: { pattern: '^a$' }, examples: [{ pattern: '^b$' }] };

        expect(withPatternFlags(schema)).toEqual(schema);
    });

    it('changes a copy and leaves the schema it was given alone', () => {
        const schema = { pattern: '^a$' };

        withPatternFlags(schema);

        expect(schema).toEqual({ pattern: '^a$' });
    });
});

describe('a pattern no engine reads in time for every text', () => {
    it('is left out of the schema the checker reads, wherever it sits', () => {
        const read = withPatternFlags({
            pattern: '^(?=.*[0-9]).{8,}$',
            properties: { id: { pattern: '^[0-9]+$' } },
            propertyNames: { pattern: '^(a|aa){1,40}$' },
        });

        expect(read).toEqual({
            properties: { id: { pattern: '^[0-9]+$', regexFlags: '' } },
            propertyNames: {},
        });
    });

    it('leaves the flags to the names patternProperties match beside it', () => {
        expect(
            withPatternFlags({ pattern: '^\\p{L}+$', patternProperties: { '^x-': {} } }),
        ).toEqual({ patternProperties: { '^x-': {} }, regexFlags: '' });
    });
});

describe('checking values against the patterns of a schema', () => {
    /** A frame shaped against the pattern would hold the window; the value is let through. */
    it('lets through what a pattern left out would judge', () => {
        const schema = compiled('{"type": "string", "pattern": "^(a|aa){1,40}$"}');

        expect(validateValue(schema, `${'a'.repeat(60)}b`)).toEqual([]);
    });

    it('still judges a nested pattern the linear engine reads', () => {
        const schema = compiled('{"type": "string", "pattern": "^(a+)+$"}');

        expect(validateValue(schema, `${'a'.repeat(40)}b`)).toHaveLength(1);
        expect(validateValue(schema, 'aaa')).toEqual([]);
    });

    it('still judges a long repetition of one thing', () => {
        const schema = compiled('{"type": "string", "pattern": "^.{1,255}$"}');

        expect(validateValue(schema, 'x'.repeat(256))).toHaveLength(1);
    });

    it('still reads the names patternProperties match the way unicode says', () => {
        const schema = compiled(
            '{"patternProperties": {"^\\\\p{L}+$": {"type": "number"}}, "additionalProperties": false}',
        );

        expect(validateValue(schema, { ñandú: 1 })).toEqual([]);
        expect(validateValue(schema, { '123': 1 })).toHaveLength(1);
    });

    it('answers the same for the same value however many times it is checked', () => {
        const schema = compiled('{"type": "string", "pattern": "^a$", "regexFlags": "g"}');

        expect([validateValue(schema, 'a'), validateValue(schema, 'a')]).toEqual([[], []]);
    });
});

function compiled(source: string): CompiledSchema {
    const result = compileSchema(source);

    if (!result.ok) {
        throw new Error(JSON.stringify(result));
    }

    return result.schema;
}
