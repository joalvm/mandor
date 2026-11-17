import { describe, expect, it } from 'vitest';

import { graphqlIntrospectResultSchema } from '../../src/index.js';
import { graphqlIntrospectRequestSchema } from '../../src/graphql/graphql-introspect.js';

const INPUT = {
    workspaceId: 'payments',
    itemPath: 'orders/list',
    environmentId: 'local',
    request: {
        kind: 'request',
        name: 'orders',
        method: 'POST',
        url: '{{host}}/graphql',
        params: [],
        headers: [],
        body: { type: 'graphql', query: '{ orders { id } }' },
        auth: { type: 'none' },
    },
};

describe('the request of graphql:introspect', () => {
    it('is the request of a send without the id of the send', () => {
        const parsed = graphqlIntrospectRequestSchema.safeParse(INPUT);

        expect(parsed.success).toBe(true);
    });

    it('refuses the id of a send: an introspection is not one', () => {
        const parsed = graphqlIntrospectRequestSchema.safeParse({
            ...INPUT,
            sendId: '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11',
        });

        expect(parsed.success).toBe(false);
    });

    it('refuses to skip scripts: an introspection runs none', () => {
        expect(
            graphqlIntrospectRequestSchema.safeParse({ ...INPUT, skipScripts: true }).success,
        ).toBe(false);
    });
});

describe('the answer of graphql:introspect', () => {
    it('carries the schema with the time it was fetched', () => {
        const answer = {
            ok: true,
            value: { fetchedAt: '2026-10-01T14:02:00.000Z', introspection: { __schema: {} } },
        };

        expect(graphqlIntrospectResultSchema.parse(answer)).toEqual(answer);
    });

    it('is a failure the interface can name by its code', () => {
        const answer = { ok: false, error: { code: 'graphql-introspection', message: 'no data' } };

        expect(graphqlIntrospectResultSchema.parse(answer)).toEqual(answer);
    });
});
