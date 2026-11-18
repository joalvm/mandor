import { describe, expect, it } from 'vitest';

import { validateTemplateText } from '../../src/validate-template/validate-template.js';

const SCHEMA = '{"type": "object", "required": ["id"], "properties": {"id": {"type": "number"}}}';

describe('validateTemplateText', () => {
    it('answers nothing while there is no schema to check against', () => {
        expect(validateTemplateText('', '{"id": 1}')).toEqual([]);
        expect(validateTemplateText('   ', '{"id": 1}')).toEqual([]);
    });

    it('answers nothing for a body the parser cannot read', () => {
        expect(validateTemplateText(SCHEMA, '{"id": {{pedidoId}}}')).toEqual([]);
    });

    it('locates every refusal, with the range it occupies in the text', () => {
        const issues = validateTemplateText(SCHEMA, '{"id": "uno"}');

        expect(issues).toEqual([
            expect.objectContaining({ path: '/id', message: 'must be number', from: 7, to: 12 }),
        ]);
    });

    it('reads a body that carries comments', () => {
        expect(validateTemplateText(SCHEMA, '{ /* nota */ "id": 1 }')).toEqual([]);
    });

    it('lets a template stand for whatever the schema asks for', () => {
        expect(validateTemplateText(SCHEMA, '{"id": "{{pedidoId}}"}')).toEqual([]);
    });

    it('refuses a body that misses a required key', () => {
        const issues = validateTemplateText(SCHEMA, '{}');

        expect(issues).toEqual([
            expect.objectContaining({
                path: '',
                keyword: 'required',
                schemaPath: '/required/0',
                from: 0,
                to: 2,
            }),
        ]);
    });

    it('answers nothing while the schema cannot be read', () => {
        expect(validateTemplateText('{"type": 5}', '{}')).toEqual([]);
    });

    it('underlines the value of a key that holds a slash', () => {
        const text = '{"a/b": "x"}';

        expect(validateTemplateText('{"properties": {"a/b": {"type": "number"}}}', text)).toEqual([
            expect.objectContaining({ from: 8, to: 11 }),
        ]);
    });

    /** The parser keeps the last of a key written twice, and that is the value refused. */
    it('underlines the last of a key written twice', () => {
        const text = '{"a": 1, "a": "x"}';

        expect(validateTemplateText('{"properties": {"a": {"type": "number"}}}', text)).toEqual([
            expect.objectContaining({ from: 14, to: 17 }),
        ]);
    });
});
