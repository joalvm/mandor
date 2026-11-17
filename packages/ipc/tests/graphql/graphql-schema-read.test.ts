import { describe, expect, it } from 'vitest';

import { graphqlSchemaReadRequestSchema, graphqlSchemaReadResultSchema } from '../../src/index.js';
import { graphqlIntrospectRequestSchema } from '../../src/graphql/graphql-introspect.js';

describe('the request of graphql:schema-read', () => {
    it('is the same as the one that asks the server, so one read finds what one ask kept', () => {
        expect(graphqlSchemaReadRequestSchema).toBe(graphqlIntrospectRequestSchema);
    });
});

describe('the answer of graphql:schema-read', () => {
    it('is empty when no schema was ever fetched, which is not a failure', () => {
        expect(graphqlSchemaReadResultSchema.parse({ ok: true, value: null })).toEqual({
            ok: true,
            value: null,
        });
    });

    it('carries the schema that was kept', () => {
        const answer = {
            ok: true,
            value: { fetchedAt: '2026-10-01T14:02:00.000Z', introspection: { __schema: {} } },
        };

        expect(graphqlSchemaReadResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a schema without a time', () => {
        expect(
            graphqlSchemaReadResultSchema.safeParse({
                ok: true,
                value: { introspection: { __schema: {} } },
            }).success,
        ).toBe(false);
    });
});
