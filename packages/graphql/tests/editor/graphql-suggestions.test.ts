import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';

import { graphqlSuggestions } from '../../src/editor/graphql-suggestions.js';

const SCHEMA = buildSchema(`
    type Query { user(id: ID!, role: Role): User }
    type User { id: ID! name: String role: Role }
    enum Role { ADMIN GUEST }
    directive @skipMe on FIELD
`);

function labelsAt(text: string, offset = text.length): string[] {
    return graphqlSuggestions(SCHEMA)(text, offset).map((suggestion) => suggestion.label);
}

describe('the suggestions of a graphql query', () => {
    it('offers the fields of the type under the caret, out of the schema', () => {
        expect(labelsAt('{ us')).toContain('user');
        expect(labelsAt('{ user(id: 1) { ')).toEqual(
            expect.arrayContaining(['id', 'name', 'role']),
        );
    });

    it('says what the field is and how to write it', () => {
        const [user] = graphqlSuggestions(SCHEMA)('{ us', 4);

        expect(user).toMatchObject({
            detail: 'User',
            insertText: 'user',
            kind: 'field',
            label: 'user',
        });
    });

    it('asks about the place of the caret, not the end of the text', () => {
        const text = '{ user(id: 1) { na } }';

        expect(labelsAt(text, text.indexOf('na') + 2)).toContain('name');
    });

    it('offers the values of an enum as enum values', () => {
        const text = '{ user(role: ';

        expect(graphqlSuggestions(SCHEMA)(text, text.length)).toEqual(
            expect.arrayContaining([expect.objectContaining({ kind: 'enum', label: 'ADMIN' })]),
        );
    });

    it('tells a type from an argument', () => {
        const kinds = (text: string) =>
            Object.fromEntries(
                graphqlSuggestions(SCHEMA)(text, text.length).map((s) => [s.label, s.kind]),
            );

        expect(kinds('fragment F on ')).toMatchObject({ User: 'type' });
        expect(kinds('{ user(')).toMatchObject({ id: 'argument', role: 'argument' });
        expect(kinds('query ($a: ')).toMatchObject({ ID: 'type', Role: 'type' });
    });

    it('offers the directives of the schema after an arroba', () => {
        const found = graphqlSuggestions(SCHEMA)('{ user(id: 1) { id @', 20);

        expect(found).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ kind: 'directive', label: 'skipMe' }),
            ]),
        );
    });

    it('offers nothing it cannot read out of a document that is not going anywhere', () => {
        expect(labelsAt('')).toEqual(expect.any(Array));
        expect(() => graphqlSuggestions(SCHEMA)('}}}} ((', 3)).not.toThrow();
    });
});
