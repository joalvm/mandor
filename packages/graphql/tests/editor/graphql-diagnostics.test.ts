import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';

import { graphqlDiagnostics } from '../../src/editor/graphql-diagnostics.js';

const SCHEMA = buildSchema(
    'type Query { user(id: ID!): User } type User { id: ID! name: String old: String @deprecated }',
);

describe('the marks of a graphql query', () => {
    it('marks a field the schema does not have, over the field', () => {
        const text = '{ nope }';
        const [mark] = graphqlDiagnostics(SCHEMA)(text);

        expect(mark).toMatchObject({ from: 2, severity: 'error', to: 6 });
        expect(mark?.message).toContain('nope');
        expect(text.slice(mark?.from, mark?.to)).toBe('nope');
    });

    it('is quiet about a query the schema agrees with', () => {
        expect(graphqlDiagnostics(SCHEMA)('{ user(id: 1) { name } }')).toEqual([]);
    });

    it('marks a syntax error with or without a schema', () => {
        expect(graphqlDiagnostics(SCHEMA)('{ user(')).toHaveLength(1);
        expect(graphqlDiagnostics(null)('{ user(')).toHaveLength(1);
    });

    it('checks only the syntax while there is no schema: a field cannot be wrong yet', () => {
        expect(graphqlDiagnostics(null)('{ nope }')).toEqual([]);
    });

    it('says nothing of a query that is not there yet', () => {
        expect(graphqlDiagnostics(SCHEMA)('')).toEqual([]);
        expect(graphqlDiagnostics(SCHEMA)('  \n ')).toEqual([]);
    });

    it('gives a mark at the end of the text something to cover', () => {
        const text = '{ ';
        const [mark] = graphqlDiagnostics(null)(text);

        expect(mark).toBeDefined();
        expect(mark?.to).toBeGreaterThan(mark?.from ?? 0);
        expect(mark?.to).toBeLessThanOrEqual(text.length);
    });

    it('tells an error from what is not one', () => {
        const [mark] = graphqlDiagnostics(SCHEMA)('{ user(id: 1) { old } }');

        expect(mark).toMatchObject({ severity: 'warning' });
    });
});
