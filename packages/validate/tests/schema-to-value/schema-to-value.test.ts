import { describe, expect, it } from 'vitest';

import { schemaToValue } from '../../src/schema-to-value/schema-to-value.js';

const SCHEMA = JSON.stringify({
    properties: {
        body: {
            properties: {
                code: { pattern: '^[A-Z]{3}-\\d{3}$', type: 'string' },
                email: { format: 'email', type: 'string' },
                id: { minimum: 1, type: 'integer' },
                label: { enum: ['uno', 'dos'], type: 'string' },
                size: { const: 42 },
                tag: { examples: ['hola'], type: 'string' },
                when: { default: 'siempre', type: 'string' },
            },
            type: 'object',
        },
    },
    type: 'object',
});

/** The body the generation wrote, read back as the data it claims to be. */
function bodyOf(schema: string, options?: { seed?: number }): Record<string, unknown> {
    return JSON.parse(schemaToValue(schema, options)) as Record<string, unknown>;
}

/** Same, for the schema whose body is a list. */
function listOf(schema: string, options?: { seed?: number }): unknown[] {
    return JSON.parse(schemaToValue(schema, options)) as unknown[];
}

describe('schemaToValue', () => {
    it('answers a body the schema asks for', () => {
        const body = bodyOf(
            '{"type": "object", "properties": {"id": {"type": "number"}}, "required": ["id"]}',
        );

        expect(typeof body['id']).toBe('number');
    });

    it('honors const, enum, examples and default', () => {
        const body = bodyOf(SCHEMA) as {
            body: { label: string; size: number; tag: string; when: string };
        };

        expect(body.body.size).toBe(42);
        expect(['uno', 'dos']).toContain(body.body.label);
        expect(body.body.tag).toBe('hola');
        expect(body.body.when).toBe('siempre');
    });

    it('honors a pattern, which it draws instead of the engine', () => {
        const body = bodyOf(SCHEMA) as { body: { code: string } };

        expect(body.body.code).toMatch(/^[A-Z]{3}-\d{3}$/);
    });

    it('honors the formats of the standard', () => {
        const body = bodyOf(SCHEMA) as { body: { email: string } };

        expect(body.body.email).toMatch(/.+@.+/);
    });

    it('honors the bounds of numbers and strings', () => {
        const body = bodyOf(
            '{"type":"object","properties":{"a":{"type":"number","minimum":5,"maximum":10},"b":{"type":"string","minLength":5,"maxLength":8},"c":{"type":"number","multipleOf":0.5},"d":{"type":"number","exclusiveMinimum":5}}}',
        );

        expect(body['a']).toBeGreaterThanOrEqual(5);
        expect(body['a']).toBeLessThanOrEqual(10);
        expect(String(body['b']).length).toBeGreaterThanOrEqual(5);
        expect(String(body['b']).length).toBeLessThanOrEqual(8);
        expect(Math.abs(Number(body['c']) % 0.5)).toBe(0);
        expect(body['d']).toBeGreaterThan(5);
    });

    it('generates the properties of an object, and nothing past them when they are closed', () => {
        const body = bodyOf(
            '{"type":"object","properties":{"a":{"type":"string"}},"additionalProperties":false}',
        );

        expect(Object.keys(body)).toEqual(['a']);
    });

    it('reads the items of an array in both words of the standard', () => {
        const tuple = bodyOf('{"type":"array","items":[{"type":"number"},{"type":"string"}]}');

        expect(typeof tuple[0]).toBe('number');
        expect(typeof tuple[1]).toBe('string');

        const list = listOf('{"type":"array","items":{"type":"number"},"minItems":2,"maxItems":4}');

        expect(list.length).toBeGreaterThanOrEqual(2);
        expect(list.length).toBeLessThanOrEqual(4);
    });

    it('reads prefixItems, the tuple of 2020-12', () => {
        const tuple = bodyOf(
            '{"type":"array","prefixItems":[{"type":"number"},{"type":"string"}]}',
        );

        expect(typeof tuple[0]).toBe('number');
        expect(typeof tuple[1]).toBe('string');
    });

    it('keeps the items of an array apart when the schema says they are unique', () => {
        const list = listOf(
            '{"type":"array","items":{"enum":[1,2,3]},"minItems":3,"uniqueItems":true}',
        );

        expect(new Set(list).size).toBe(list.length);
    });

    it('merges allOf and picks a branch of anyOf and oneOf', () => {
        const merged = bodyOf(
            '{"allOf":[{"type":"object"},{"properties":{"a":{"type":"number"}},"required":["a"]}]}',
        );

        expect(typeof merged['a']).toBe('number');

        const branch = bodyOf('{"anyOf":[{"type":"number"},{"type":"string","pattern":"^b"}]}');

        expect(['number', 'string']).toContain(typeof branch);
    });

    it('resolves a local $ref, in both houses of the standard', () => {
        const defs = bodyOf(
            '{"type":"object","properties":{"a":{"$ref":"#/$defs/Num"}},"$defs":{"Num":{"type":"number","minimum":1}}}',
        );

        expect(defs['a']).toBeGreaterThanOrEqual(1);

        const definitions = bodyOf(
            '{"type":"object","properties":{"a":{"$ref":"#/definitions/Num"}},"definitions":{"Num":{"type":"number"}}}',
        );

        expect(typeof definitions['a']).toBe('number');
    });

    it('bounds a cycle, which would otherwise never end', () => {
        const body = bodyOf(
            '{"type":"object","properties":{"next":{"$ref":"#/definitions/node"}},"definitions":{"node":{"type":"object","properties":{"v":{"type":"number"},"next":{"$ref":"#/definitions/node"}}}}}',
            { seed: 3 },
        );

        let depth = 0;
        let node: Record<string, unknown> = body;

        while (typeof node['next'] === 'object' && node['next'] !== null) {
            node = node['next'] as Record<string, unknown>;
            depth += 1;

            expect(depth).toBeLessThan(10);
        }
    });

    it('answers the same body while the seed is the same', () => {
        expect(schemaToValue(SCHEMA, { seed: 42 })).toBe(schemaToValue(SCHEMA, { seed: 42 }));
    });

    it('answers another body every time it is asked without a seed', () => {
        expect(schemaToValue(SCHEMA)).not.toBe(schemaToValue(SCHEMA));
    });

    it('falls to the base type the schema names when a keyword cannot be drawn', () => {
        expect(typeof bodyOf('{"type":"string","pattern":"(?=a)(?!b)"}')).toBe('string');
        expect(typeof bodyOf('{"type":"string","pattern":"["}')).toBe('string');
    });

    it('answers a ref that resolves nowhere with an empty body to edit, and never an error', () => {
        expect(schemaToValue('{"type":"object","properties":{"a":{"$ref":"#/$defs/Nope"}}}')).toBe(
            '{}',
        );
    });

    it('generates an empty object to edit when the schema cannot be read at all', () => {
        expect(schemaToValue('esto no es un esquema')).toBe('{}');
        expect(schemaToValue('')).toBe('{}');
    });
});
