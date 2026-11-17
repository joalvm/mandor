import { describe, expect, it } from 'vitest';

import { compileSchema } from '../../src/compile-schema/compile-schema.js';

describe('compileSchema', () => {
    it('compiles a valid schema text into a compiled schema carrying the text it came from', () => {
        const result = compileSchema('{"type": "object"}');

        expect(result.ok).toBe(true);

        if (result.ok) {
            expect(result.schema.source).toBe('{"type": "object"}');
        }
    });

    it('answers with an error instead of throwing when the text is not JSON', () => {
        const result = compileSchema('{type: object}');

        expect(result).toEqual({
            ok: false,
            message: expect.stringContaining('JSON') as string,
        });
    });

    /** What draws a value from a schema reads comments and a trailing comma; the check reads the same. */
    it('reads a schema text with comments and a trailing comma, as the draw of a value does', () => {
        const result = compileSchema('{\n  // what the gateway sends\n  "type": "object",\n}');

        expect(result.ok).toBe(true);
    });

    it('answers with an error instead of throwing when the schema itself is broken', () => {
        const result = compileSchema('{"required": "nope"}');

        expect(result).toEqual({
            ok: false,
            message: expect.stringContaining('required') as string,
        });
    });

    /** A pattern that is no regex would break the check of every value written against it. */
    it('answers with an error when a pattern, however deep, is no regex', () => {
        const result = compileSchema(
            '{"type": "object", "properties": {"code": {"type": "string", "pattern": "[a-"}}}',
        );

        expect(result).toEqual({
            ok: false,
            message: expect.stringContaining('#/properties/code') as string,
        });
    });

    it('answers with an error when the text is JSON and no schema', () => {
        const result = compileSchema('42');

        expect(result.ok).toBe(false);
    });

    it('answers with an error instead of throwing when the checker cannot read the schema', () => {
        expect(compileSchema('{"$ref": 5}')).toEqual({
            ok: false,
            message: expect.stringMatching(/^the schema cannot be read: /u) as string,
        });
    });

    it('answers with an error for a reference to a definition the schema lacks', () => {
        expect(compileSchema('{"$ref": "#/$defs/missing"}').ok).toBe(false);
    });

    it('forgets the oldest text once it holds as many as it keeps', () => {
        const first = compileSchema('{"title": "0"}');

        for (let index = 1; index <= 32; index += 1) {
            compileSchema(`{"title": "${String(index)}"}`);
        }

        const again = compileSchema('{"title": "0"}');

        expect(first.ok && again.ok && again.schema !== first.schema).toBe(true);
    });

    it('compiles the same text to the same compiled schema without compiling it again', () => {
        const text = '{"type": "string"}';
        const first = compileSchema(text);
        const second = compileSchema(text);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);

        if (first.ok && second.ok) {
            expect(second.schema).toBe(first.schema);
        }
    });

    it('reads a schema with a format as a schema', () => {
        const result = compileSchema(
            '{"type": "object", "properties": {"email": {"type": "string", "format": "email"}}}',
        );

        expect(result.ok).toBe(true);
    });
});
