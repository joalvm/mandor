import { describe, expect, it } from 'vitest';

import {
    type GraphqlSchemaCache,
    graphqlSchemaCacheSchema,
} from '../../src/graphql/graphql-schema-cache.js';

const cache = {
    fetchedAt: '2026-10-01T14:02:00.000Z',
    introspection: { __schema: { queryType: { name: 'Query' }, types: [] } },
};

describe('graphqlSchemaCacheSchema', () => {
    it('reads the introspection of a server and writes it back as it came', () => {
        const parsed: GraphqlSchemaCache = graphqlSchemaCacheSchema.parse(cache);

        expect(parsed).toEqual(cache);
    });

    it('keeps the keys of the server that this version does not know', () => {
        const parsed = graphqlSchemaCacheSchema.parse({
            ...cache,
            introspection: { __schema: { types: [], later: 1 }, extra: true },
        });

        expect(parsed.introspection).toEqual({ __schema: { types: [], later: 1 }, extra: true });
    });

    it.each([
        ['an introspection without a schema', { ...cache, introspection: {} }],
        ['a time that is not ISO', { ...cache, fetchedAt: 'ayer' }],
        ['a key of its own that it does not know', { ...cache, stale: false }],
    ])('refuses %s', (_name, value) => {
        expect(graphqlSchemaCacheSchema.safeParse(value).success).toBe(false);
    });
});
