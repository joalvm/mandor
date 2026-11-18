import { describe, expect, it } from 'vitest';

import { schemaLintOf } from '../../src/editor/schema-lint-of.js';

describe('schemaLintOf', () => {
    it('answers nothing while no schema is written', () => {
        expect(schemaLintOf(undefined)).toBeUndefined();
        expect(schemaLintOf('')).toBeUndefined();
        expect(schemaLintOf('   ')).toBeUndefined();
    });

    // The schema is written beside the body, so the editor reads it again on every check.
    it('hands the schema to the editor, to be read on every check', () => {
        const lint = schemaLintOf('{"type": "object"}');

        expect(lint?.schema()).toBe('{"type": "object"}');
    });
});
