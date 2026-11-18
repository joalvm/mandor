import { describe, expect, it } from 'vitest';

import { graphqlSchemaViewOf } from '../../../../src/renderer/features/requests/lib/graphql-schema-view.js';
import { GRAPHQL_CACHE } from '../../support/graphql-schema-fixtures.js';

const NOTHING = { cache: null, error: null, loading: false };

describe('what the editor is told of a schema', () => {
    it('is none with nothing kept and nothing asked', () => {
        expect(graphqlSchemaViewOf(NOTHING)).toEqual({
            error: null,
            fetchedAt: null,
            schema: null,
            state: 'none',
        });
    });

    it('is ready with a schema kept, carrying when it came', () => {
        const view = graphqlSchemaViewOf({ ...NOTHING, cache: GRAPHQL_CACHE });

        expect(view.state).toBe('ready');
        expect(view.fetchedAt).toBe(GRAPHQL_CACHE.fetchedAt);
        expect(view.schema).not.toBeNull();
    });

    it('is loading while the server is asked, over whatever else is known', () => {
        const view = graphqlSchemaViewOf({
            cache: GRAPHQL_CACHE,
            error: 'request-timeout',
            loading: true,
        });

        expect(view.state).toBe('loading');
    });

    it('is failed after an ask that failed, and keeps the schema that was kept', () => {
        const view = graphqlSchemaViewOf({
            cache: GRAPHQL_CACHE,
            error: 'request-timeout',
            loading: false,
        });

        expect(view).toMatchObject({ error: 'request-timeout', state: 'failed' });
        expect(view.schema).not.toBeNull();
    });

    it('is failed with a kept schema the app cannot build', () => {
        const view = graphqlSchemaViewOf({
            ...NOTHING,
            cache: { fetchedAt: GRAPHQL_CACHE.fetchedAt, introspection: { __schema: {} } },
        });

        expect(view).toMatchObject({
            error: 'graphql-introspection',
            schema: null,
            state: 'failed',
        });
    });
});
