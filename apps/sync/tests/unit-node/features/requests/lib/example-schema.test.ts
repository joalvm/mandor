import { describe, expect, it } from 'vitest';

import {
    generatedSchema,
    schemaErrorOf,
    withSchemaText,
} from '../../../../../src/renderer/features/requests/lib/example-schema.js';

const EXAMPLE = { body: '{}', contentType: 'application/json', name: 'creado', status: '201' };

describe('the schema of the answer of an example (example-schema)', () => {
    it('writes a schema from the body that asks for every key it has', () => {
        expect(JSON.parse(generatedSchema('{"id":1,"tags":["a"]}') ?? '')).toEqual({
            properties: {
                id: { type: 'number' },
                tags: { items: { type: 'string' }, type: 'array' },
            },
            required: ['id', 'tags'],
            type: 'object',
        });
    });

    it('writes none for a body that is not JSON', () => {
        expect(generatedSchema('plain text')).toBeNull();
        expect(generatedSchema('')).toBeNull();
    });

    it('sets the text of the schema on the example', () => {
        expect(withSchemaText(EXAMPLE, '{"type":"object"}')).toEqual({
            ...EXAMPLE,
            schema: '{"type":"object"}',
        });
        expect(withSchemaText({ ...EXAMPLE, schema: 'old' }, 'new').schema).toBe('new');
    });

    it('takes the schema out for a text that says nothing', () => {
        const cleared = withSchemaText({ ...EXAMPLE, schema: '{}' }, '  ');

        expect(cleared).toEqual(EXAMPLE);
        expect(cleared).not.toHaveProperty('schema');
    });
});

describe('why a schema cannot be read (schemaErrorOf)', () => {
    it('finds nothing wrong with a schema that reads, nor with none', () => {
        expect(schemaErrorOf('{"type":"object"}')).toBeUndefined();
        expect(schemaErrorOf(undefined)).toBeUndefined();
        expect(schemaErrorOf('  ')).toBeUndefined();
    });

    it('answers the words of the checker for a text that does not read', () => {
        expect(schemaErrorOf('{"type":')).toEqual(expect.any(String));
    });
});
