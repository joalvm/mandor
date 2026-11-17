import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import {
    schemaStrictnessOf,
    withAllRequired,
    withClosedObjects,
} from '../../src/schema-strictness/schema-strictness.js';

const USER = `{
    // what the server answers
    "type": "object",
    "properties": {
        "id": { "type": "integer" },
        "address": {
            "type": "object",
            "properties": { "city": { "type": "string" } }
        },
        "tags": { "type": "array", "items": { "type": "string" } }
    }
}`;

function parsedOf(text: string): unknown {
    return parse(text);
}

describe('schemaStrictnessOf', () => {
    it('reads a schema that keeps no rule as neither closed nor required', () => {
        expect(schemaStrictnessOf(USER)).toEqual({ closed: 'none', required: 'none' });
    });

    it('reads the rules each object keeps: all, some or none', () => {
        const text = JSON.stringify({
            properties: { a: { properties: { b: {} }, additionalProperties: false } },
            required: ['a'],
        });

        expect(schemaStrictnessOf(text)).toEqual({ closed: 'some', required: 'some' });
    });

    it('reads nothing while the text cannot be read', () => {
        expect(schemaStrictnessOf('{"type": ')).toBeUndefined();
    });

    it('reads a schema with no object in it as keeping no rule', () => {
        expect(schemaStrictnessOf('{"type": "string"}')).toEqual({
            closed: 'none',
            required: 'none',
        });
    });
});

describe('withClosedObjects', () => {
    it('closes every object it describes, comments and indentation kept', () => {
        const closed = withClosedObjects(USER, true);

        expect(closed).toContain('// what the server answers');
        expect(closed).toContain('\n    "unevaluatedProperties": false');
        expect(parsedOf(closed)).toMatchObject({
            unevaluatedProperties: false,
            properties: { address: { unevaluatedProperties: false } },
        });
        expect(schemaStrictnessOf(closed)?.closed).toBe('all');
    });

    it('opens them again, the older word of closing too', () => {
        const text = JSON.stringify({
            properties: { a: { properties: { b: {} }, additionalProperties: false } },
            unevaluatedProperties: false,
        });

        expect(parsedOf(withClosedObjects(text, false))).toEqual({
            properties: { a: { properties: { b: {} } } },
        });
    });

    it('closes the object that applies branches in place, never the branches', () => {
        const text = JSON.stringify({
            allOf: [{ $ref: '#/$defs/base' }, { properties: { b: {} } }],
            $defs: { base: { properties: { a: {} } } },
        });

        expect(parsedOf(withClosedObjects(text, true))).toEqual({
            allOf: [{ $ref: '#/$defs/base' }, { properties: { b: {} } }],
            $defs: { base: { properties: { a: {} } } },
            unevaluatedProperties: false,
        });
    });

    it('closes with the word of the draft the schema names', () => {
        const text = JSON.stringify({
            $schema: 'http://json-schema.org/draft-07/schema#',
            properties: { a: {} },
        });

        expect(parsedOf(withClosedObjects(text, true))).toMatchObject({
            additionalProperties: false,
        });
    });

    it('leaves alone a text it cannot read, or one with nothing to close', () => {
        expect(withClosedObjects('{"type": ', true)).toBe('{"type": ');
        expect(withClosedObjects('42', true)).toBe('42');
    });

    it('leaves an object that already closes as it was written', () => {
        const text = '{"properties": {"a": {}}, "additionalProperties": false}';

        expect(withClosedObjects(text, true)).toBe(text);
    });

    it('keeps the tabs and the line ends the text uses', () => {
        const text = '{\r\n\t"properties": {\r\n\t\t"a": {}\r\n\t}\r\n}';

        expect(withClosedObjects(text, true)).toContain('\r\n\t"unevaluatedProperties": false');
    });

    it('writes a closing rule into a text written on one line', () => {
        expect(parsedOf(withClosedObjects('{"properties": {"a": {}}}', true))).toEqual({
            properties: { a: {} },
            unevaluatedProperties: false,
        });
    });
});

describe('withAllRequired', () => {
    it('makes every declared key required, keys already listed first', () => {
        const text = JSON.stringify({ properties: { a: {}, b: {} }, required: ['b', 'x'] });

        expect(parsedOf(withAllRequired(text, true))).toEqual({
            properties: { a: {}, b: {} },
            required: ['b', 'x', 'a'],
        });
        expect(schemaStrictnessOf(withAllRequired(USER, true))?.required).toBe('all');
    });

    it('takes the declared keys out again, and the list once it is empty', () => {
        const text = JSON.stringify({
            properties: { a: {}, b: { properties: { c: {} }, required: ['c'] } },
            required: ['a', 'x', 3],
        });

        expect(parsedOf(withAllRequired(text, false))).toEqual({
            properties: { a: {}, b: { properties: { c: {} } } },
            required: ['x', 3],
        });
    });

    it('changes nothing that already says it, and nothing it cannot read', () => {
        const text = JSON.stringify({ properties: { a: {} }, required: ['a'] });
        const open = '{"properties": {"a": {}}}';

        expect(withAllRequired(text, true)).toBe(text);
        expect(withAllRequired(open, false)).toBe(open);
        expect(withAllRequired('{', true)).toBe('{');
    });
});
