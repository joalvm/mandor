import { describe, expect, it } from 'vitest';

import { schemaTriviality } from '../../src/schema-generation/schema-triviality.js';

describe('schemaTriviality', () => {
    it('sees an empty schema as empty, blanks included', () => {
        expect(schemaTriviality('{"id": 1}', '')).toBe('empty');
        expect(schemaTriviality('{"id": 1}', '   \n  ')).toBe('empty');
    });

    it('sees the schema the body generates as asGenerated, comments and trailing commas aside', () => {
        const payload = '{"id": 7, "name": "uno"}';
        const generated = {
            type: 'object',
            properties: { id: { type: 'number' }, name: { type: 'string' } },
        };

        expect(schemaTriviality(payload, JSON.stringify(generated))).toBe('asGenerated');
        expect(
            schemaTriviality(
                payload,
                [
                    '// lo que viaja',
                    '{',
                    '  "type": "object",',
                    '  "properties": {',
                    '    "id": { "type": "number" },',
                    '    "name": { "type": "string" },',
                    '  },',
                    '}',
                ].join('\n'),
            ),
        ).toBe('asGenerated');
    });

    it('sees the schema of a list as asGenerated whatever the order of its keys', () => {
        expect(
            schemaTriviality(
                '[{"id": 7}]',
                '{"items": {"properties": {"id": {"type": "number"}}, "type": "object"}, "type": "array"}',
            ),
        ).toBe('asGenerated');
    });

    it('sees a schema that carries more than the body tells as hasMore', () => {
        expect(
            schemaTriviality(
                '{"id": 7}',
                '{"type": "object", "properties": {"id": {"type": ["number", "null"]}}}',
            ),
        ).toBe('hasMore');
        expect(
            schemaTriviality(
                '{"id": 7}',
                '{"type": "object", "properties": {"id": {"type": "number", "minimum": 1}}}',
            ),
        ).toBe('hasMore');
        expect(
            schemaTriviality(
                '{"id": 7}',
                '{"type": "object", "properties": {"id": {"type": "number"}}, "required": ["id"]}',
            ),
        ).toBe('hasMore');
        expect(schemaTriviality('{"id": 7}', '{"type": "object"}')).toBe('hasMore');
    });

    it('sees a schema it cannot read as hasMore', () => {
        expect(schemaTriviality('{"id": 7}', 'esto no es un esquema')).toBe('hasMore');
    });

    it('sees a body it cannot read as hasMore: nobody generates from a broken body', () => {
        expect(schemaTriviality('{"id": ', '{"type": "object"}')).toBe('hasMore');
        expect(schemaTriviality('{{pedidoId}}', '{"type": "object"}')).toBe('hasMore');
    });
});
