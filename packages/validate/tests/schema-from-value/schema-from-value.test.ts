import { describe, expect, it } from 'vitest';

import { schemaFromValue } from '../../src/schema-from-value/schema-from-value.js';

describe('schemaFromValue', () => {
    it('names every key of an object with the type of its value', () => {
        expect(schemaFromValue({ id: 5, sent: true, note: 'hola' })).toBe(
            [
                '{',
                '  "type": "object",',
                '  "properties": {',
                '    "id": {',
                '      "type": "number"',
                '    },',
                '    "sent": {',
                '      "type": "boolean"',
                '    },',
                '    "note": {',
                '      "type": "string"',
                '    }',
                '  }',
                '}',
            ].join('\n'),
        );
    });

    it('walks nested objects and arrays, and takes the items of an array from its first element', () => {
        expect(schemaFromValue({ user: { name: 'Ada' }, tags: ['a', 'b'] })).toBe(
            [
                '{',
                '  "type": "object",',
                '  "properties": {',
                '    "user": {',
                '      "type": "object",',
                '      "properties": {',
                '        "name": {',
                '          "type": "string"',
                '        }',
                '      }',
                '    },',
                '    "tags": {',
                '      "type": "array",',
                '      "items": {',
                '        "type": "string"',
                '      }',
                '    }',
                '  }',
                '}',
            ].join('\n'),
        );
    });

    it('answers the bare type for empty objects, empty arrays and primitives at the root', () => {
        expect(schemaFromValue({})).toBe(['{', '  "type": "object"', '}'].join('\n'));
        expect(schemaFromValue([])).toBe(['{', '  "type": "array"', '}'].join('\n'));
        expect(schemaFromValue('hola')).toBe(['{', '  "type": "string"', '}'].join('\n'));
        expect(schemaFromValue(42)).toBe(['{', '  "type": "number"', '}'].join('\n'));
        expect(schemaFromValue(false)).toBe(['{', '  "type": "boolean"', '}'].join('\n'));
        expect(schemaFromValue(null)).toBe(['{', '  "type": "null"', '}'].join('\n'));
    });

    it('reads a template inside the value as the string it is', () => {
        expect(schemaFromValue({ id: '{{pedidoId}}' })).toBe(
            [
                '{',
                '  "type": "object",',
                '  "properties": {',
                '    "id": {',
                '      "type": "string"',
                '    }',
                '  }',
                '}',
            ].join('\n'),
        );
    });

    it('asks for every key it saw, in each object however deep, when told to', () => {
        expect(
            JSON.parse(
                schemaFromValue(
                    { user: { name: 'Ada' }, rows: [{ id: 1 }], none: {} },
                    { required: true },
                ),
            ),
        ).toEqual({
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: { name: { type: 'string' } },
                    required: ['name'],
                },
                rows: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: { id: { type: 'number' } },
                        required: ['id'],
                    },
                },
                none: { type: 'object' },
            },
            required: ['user', 'rows', 'none'],
        });
    });

    it('asks for nothing unless told to', () => {
        expect(schemaFromValue({ id: 5 }, {})).toBe(schemaFromValue({ id: 5 }));
        expect(schemaFromValue({ id: 5 })).not.toContain('required');
    });

    /** JSON can name a key `__proto__`; the schema names it like any other key. */
    it('names a key called __proto__ as a property of its own', () => {
        expect(JSON.parse(schemaFromValue(JSON.parse('{"__proto__": 1}')))).toEqual({
            type: 'object',
            properties: { ['__proto__']: { type: 'number' } },
        });
    });
});
