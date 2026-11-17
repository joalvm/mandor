import { describe, expect, it } from 'vitest';

import { schemaViolations } from '../../../../../../src/renderer/features/requests/lib/compare/schema-violations.js';

const SCHEMA = JSON.stringify({
    properties: { expire: { type: 'number' }, ok: { type: 'boolean' } },
    required: ['expire', 'ok'],
    type: 'object',
});

describe('the rules an answer breaks under its schema (schemaViolations)', () => {
    it('breaks nothing without a schema, nor without a body', () => {
        expect(schemaViolations(undefined, '{"a":1}')).toEqual([]);
        expect(schemaViolations('  ', '{"a":1}')).toEqual([]);
        expect(schemaViolations(SCHEMA, '')).toEqual([]);
        expect(schemaViolations(SCHEMA, '   ')).toEqual([]);
    });

    it('judges a body that is not JSON as the string it is', () => {
        expect(schemaViolations(SCHEMA, '<html>Bad gateway</html>')).toEqual([
            expect.objectContaining({ keyword: 'type', path: '' }),
        ]);
        expect(schemaViolations('{"type":"string"}', 'plain text')).toEqual([]);
        expect(schemaViolations('{"type":"string","pattern":"^ok"}', 'nope')).toEqual([
            expect.objectContaining({ keyword: 'pattern', path: '' }),
        ]);
    });

    it('names where the value is, the rule it breaks and where that rule is written', () => {
        expect(schemaViolations(SCHEMA, '{"expire":"soon","ok":true}')).toEqual([
            expect.objectContaining({
                keyword: 'type',
                path: '/expire',
                schemaPath: '/properties/expire/type',
            }),
        ]);
    });

    it('puts a missing key on the object that lacks it', () => {
        expect(schemaViolations(SCHEMA, '{"ok":true}')).toEqual([
            expect.objectContaining({ keyword: 'required', path: '' }),
        ]);
    });

    it('answers why a schema cannot be read, and checks against nothing', () => {
        const answer = schemaViolations('{"type":', '{"a":1}');

        expect(answer).toEqual({ error: expect.any(String) as string });
    });
});
