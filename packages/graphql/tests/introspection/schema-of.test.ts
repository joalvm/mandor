import { buildSchema, graphqlSync } from 'graphql';
import { describe, expect, it } from 'vitest';

import { INTROSPECTION_QUERY } from '../../src/introspection/introspection-query.js';
import { schemaOf } from '../../src/introspection/schema-of.js';

const SOURCE = 'type Query { user(id: ID!): User } type User { id: ID! name: String }';

function introspectionOf(source: string): unknown {
    return graphqlSync({ schema: buildSchema(source), source: INTROSPECTION_QUERY }).data;
}

describe('INTROSPECTION_QUERY', () => {
    it('asks for the whole schema, and a server can answer it', () => {
        expect(INTROSPECTION_QUERY).toContain('__schema');
        expect(introspectionOf(SOURCE)).toHaveProperty('__schema.queryType.name', 'Query');
    });
});

describe('schemaOf', () => {
    it('builds a schema from what a server answered to the introspection query', () => {
        const result = schemaOf(introspectionOf(SOURCE));

        expect(result.ok).toBe(true);
        expect(result.ok && Object.keys(result.schema.getTypeMap())).toContain('User');
    });

    it('answers with the message of the failure instead of throwing', () => {
        const result = schemaOf({ not: 'an introspection' });

        expect(result.ok).toBe(false);
        expect(!result.ok && result.message).not.toBe('');
    });

    it('says why a schema it cannot build cannot be built, with the message of the failure', () => {
        const result = schemaOf({ __schema: {} });

        expect(result.ok).toBe(false);
        expect(!result.ok && result.message).not.toBe('');
    });

    it.each([null, 3, 'x'])('refuses %s', (value) => {
        expect(schemaOf(value).ok).toBe(false);
    });
});
