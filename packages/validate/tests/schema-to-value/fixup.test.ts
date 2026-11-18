import { describe, expect, it } from 'vitest';

import { fixedForGeneration } from '../../src/schema-to-value/fixup.js';
import { mulberry32 } from '../../src/schema-to-value/random.js';

const RNG = mulberry32(1);

describe('fixedForGeneration', () => {
    it('answers a pattern with a value that meets it', () => {
        const fixed = fixedForGeneration(
            { properties: { code: { pattern: '^[A-Z]{3}-\\d{3}$', type: 'string' } } },
            RNG,
        ) as { properties: { code: { const: string } } };

        expect(fixed.properties.code.const).toMatch(/^[A-Z]{3}-\d{3}$/);
    });

    it('leaves a pattern alone when const, enum or a lookaround already say what the value is', () => {
        const fixed = fixedForGeneration(
            {
                properties: {
                    a: { const: 'fijo', pattern: '^x$' },
                    b: { enum: [1, 2], pattern: '^x$' },
                    c: { pattern: '^(?=\\d)' },
                },
            },
            RNG,
        ) as { properties: { a: object; b: object; c: object } };

        expect(fixed.properties.a).toEqual({ const: 'fijo', pattern: '^x$' });
        expect(fixed.properties.b).toEqual({ enum: [1, 2], pattern: '^x$' });
        expect(fixed.properties.c).toEqual({ pattern: '^(?=\\d)' });
    });

    it('drops a pattern that is no regex at all: the type it sits on answers', () => {
        const fixed = fixedForGeneration(
            { properties: { a: { pattern: '[', type: 'string' } } },
            RNG,
        ) as {
            properties: { a: object };
        };

        expect(fixed.properties.a).toEqual({ type: 'string' });
    });

    it('writes the tuple of items the way the engine reads it, without generating past it', () => {
        const tuple = fixedForGeneration(
            { items: [{ type: 'number' }, { type: 'string' }] },
            RNG,
        ) as { items: boolean; prefixItems: unknown[] };

        expect(tuple.prefixItems).toEqual([{ type: 'number' }, { type: 'string' }]);
        expect(tuple.items).toBe(false);
    });

    it('lets additionalItems say what comes past the tuple', () => {
        const tuple = fixedForGeneration(
            { additionalItems: { type: 'number' }, items: [{ type: 'string' }] },
            RNG,
        ) as { items: object };

        expect(tuple.items).toEqual({ type: 'number' });
    });

    it('walks into arrays and leaves the rest as it came', () => {
        expect(fixedForGeneration(['a', 1, null, { type: 'string' }], RNG)).toEqual([
            'a',
            1,
            null,
            { type: 'string' },
        ]);
        expect(fixedForGeneration('texto', RNG)).toBe('texto');
        expect(fixedForGeneration(null, RNG)).toBeNull();
        expect(fixedForGeneration(7, RNG)).toBe(7);
    });
});
