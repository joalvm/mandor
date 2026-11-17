import { describe, expect, it } from 'vitest';

import { operationsOf } from '../../src/document/operations-of.js';

describe('operationsOf', () => {
    it('lists named and anonymous operations with their kind', () => {
        const result = operationsOf('query A { a } mutation { b } subscription S { c }');

        expect(result).toEqual({
            ok: true,
            fragments: [],
            operations: [
                { name: 'A', kind: 'query' },
                { name: null, kind: 'mutation' },
                { name: 'S', kind: 'subscription' },
            ],
        });
    });

    it('lists the fragments the document defines, apart from the operations', () => {
        const result = operationsOf('{ user { ...Basics } } fragment Basics on User { id }');

        expect(result).toEqual({
            ok: true,
            fragments: ['Basics'],
            operations: [{ name: null, kind: 'query' }],
        });
    });

    it('answers with the message of a syntax error instead of throwing', () => {
        const result = operationsOf('query { ');

        expect(result.ok).toBe(false);
        expect(!result.ok && result.message).toContain('Syntax Error');
    });

    it('does not take an empty document for a valid one', () => {
        expect(operationsOf('').ok).toBe(false);
    });
});
