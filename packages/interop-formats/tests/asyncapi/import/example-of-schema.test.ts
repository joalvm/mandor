import { describe, expect, it } from 'vitest';

import { exampleOfSchema } from '../../../src/asyncapi/import/example-of-schema.js';

describe('exampleOfSchema', () => {
    it('samples every declared property of an object', () => {
        expect(
            exampleOfSchema({
                type: 'object',
                properties: { id: { type: 'string' }, total: { type: 'number' } },
            }),
        ).toEqual({ id: '', total: 0 });
    });

    it('prefers the value the schema states outright', () => {
        expect(exampleOfSchema({ type: 'string', example: 'hola' })).toBe('hola');
        expect(exampleOfSchema({ type: 'string', default: 'mundo' })).toBe('mundo');
        expect(exampleOfSchema({ type: 'string', const: 'fijo' })).toBe('fijo');
        expect(exampleOfSchema({ type: 'string', enum: ['a', 'b'] })).toBe('a');
    });

    it('honours the formats a validator would enforce', () => {
        expect(exampleOfSchema({ type: 'string', format: 'uuid' })).toBe(
            '00000000-0000-4000-8000-000000000000',
        );
        expect(exampleOfSchema({ type: 'string', format: 'date-time' })).toBe(
            '2024-01-01T00:00:00.000Z',
        );
        expect(exampleOfSchema({ type: 'string', format: 'email' })).toBe('user@example.com');
    });

    it('satisfies the constraints a number forbids', () => {
        expect(exampleOfSchema({ type: 'integer', minimum: 5 })).toBe(5);
        expect(exampleOfSchema({ type: 'integer', exclusiveMinimum: 0 })).toBe(1);
    });

    it('satisfies the constraints a string or array forbids', () => {
        expect(exampleOfSchema({ type: 'string', minLength: 3 })).toBe('xxx');
        expect(exampleOfSchema({ type: 'array', items: { type: 'string' }, minItems: 2 })).toEqual([
            '',
            '',
        ]);
    });

    it('takes the first branch of a oneOf, and merges what allOf states together', () => {
        expect(exampleOfSchema({ oneOf: [{ type: 'string' }, { type: 'number' }] })).toBe('');
        expect(
            exampleOfSchema({
                allOf: [
                    { type: 'object', properties: { id: { type: 'string' } } },
                    { type: 'object', properties: { total: { type: 'number' } } },
                ],
            }),
        ).toEqual({ id: '', total: 0 });
    });

    it('reads an untyped schema that carries properties as an object', () => {
        expect(exampleOfSchema({ properties: { id: { type: 'string' } } })).toEqual({ id: '' });
    });

    it('samples a boolean as false', () => {
        expect(exampleOfSchema({ type: 'boolean' })).toBe(false);
    });

    it('takes the format sample a pattern accepts, since a pattern cannot be inverted', () => {
        expect(exampleOfSchema({ type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' })).toBe(
            '2024-01-01',
        );
    });

    /**
     * A pattern with a quantifier inside a quantifier backtracks twice over for each character it
     * reads, and the document chooses it. Against the 36 characters of a uuid that is hours of
     * one thread; against a date it is a fraction of a millisecond.
     */
    it('tries a pattern only against samples too short for it to backtrack for long', () => {
        expect(exampleOfSchema({ type: 'string', pattern: '^([0-9a-f-]+)*x$' })).toBe('');
        expect(exampleOfSchema({ type: 'string', pattern: '^[0-9a-f-]{36}$' })).toBe('');
    });

    it('gives an empty text when no sample fits the pattern or the pattern is not valid', () => {
        expect(exampleOfSchema({ type: 'string', pattern: '^zzz$' })).toBe('');
        expect(exampleOfSchema({ type: 'string', pattern: '(?<name' })).toBe('');
    });

    /**
     * The sample is built from what the document states, and the document is anyone's: a floor of
     * a billion items or characters would fill the memory of the import before the editor opened.
     */
    it('caps the floor a string or an array states at what an editor can show', () => {
        const text = exampleOfSchema({ type: 'string', minLength: 1_000_000_000 });
        const list = exampleOfSchema({ type: 'array', items: { type: 'integer' }, minItems: 1e9 });

        expect(text).toHaveLength(1024);
        expect(list).toHaveLength(64);
    });

    /** Arrays inside arrays multiply their floors: eight levels of 64 items is 64^8 values. */
    it('stops sampling once the sample holds as many values as a payload can sensibly carry', () => {
        let schema: unknown = { type: 'integer' };

        for (let level = 0; level < 5; level += 1) {
            schema = { type: 'array', items: schema, minItems: 8 };
        }

        expect(valuesIn(exampleOfSchema(schema))).toBeLessThanOrEqual(2_000);
        expect(
            exampleOfSchema({ type: 'object', properties: { first: schema, second: schema } }),
        ).toMatchObject({ second: null });
    });

    it('gives up on anything it cannot sample, and stays null rather than half-written', () => {
        expect(exampleOfSchema('no es un esquema')).toBe(null);
        expect(exampleOfSchema({ type: 'null' })).toBe(null);
    });
});

/** Every value of a sample, its containers included. */
function valuesIn(sample: unknown): number {
    if (Array.isArray(sample)) {
        return 1 + sample.reduce<number>((sum, each) => sum + valuesIn(each), 0);
    }

    if (typeof sample === 'object' && sample !== null) {
        return 1 + Object.values(sample).reduce<number>((sum, each) => sum + valuesIn(each), 0);
    }

    return 1;
}
