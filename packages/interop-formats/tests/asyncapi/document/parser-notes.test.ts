import { describe, expect, it } from 'vitest';

import { stripParserNotes } from '../../../src/asyncapi/document/parser-notes.js';

describe('stripParserNotes', () => {
    it('removes the x-parser keys the model injects, at every depth', () => {
        const annotated = {
            type: 'object',
            'x-parser-schema-id': '<anonymous-schema-1>',
            properties: { id: { type: 'string', 'x-parser-schema-id': '<anonymous-schema-2>' } },
        };

        expect(stripParserNotes(annotated)).toEqual({
            type: 'object',
            properties: { id: { type: 'string' } },
        });
    });

    it('walks arrays and leaves the rest of the value alone', () => {
        expect(stripParserNotes([{ a: 1, 'x-parser-tag': true }, 2])).toEqual([{ a: 1 }, 2]);
        expect(stripParserNotes('plano')).toBe('plano');
    });
});
