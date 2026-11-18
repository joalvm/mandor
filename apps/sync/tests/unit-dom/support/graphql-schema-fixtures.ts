import { itemResource } from '@mandor/collections';
import {
    createRequestItem,
    DEFAULT_REQUEST_SETTINGS,
    graphqlSchemaCacheSchema,
    type RequestItem,
} from '@mandor/schema';
import { buildSchema, introspectionFromSchema } from 'graphql';

/** The item the hook of the schema is mounted for. */
export const GRAPHQL_RESOURCE = itemResource('Local', 'alpha', 'orders/list');

/** A graphql request pointing at a local server. */
export const GRAPHQL_REQUEST: RequestItem = {
    ...createRequestItem({ name: 'list' }),
    body: { query: '{ a }', type: 'graphql', variables: '' },
    method: 'POST',
    url: 'http://localhost/graphql',
};

/** That request as it reaches main: with the defaults of the app under what it kept. */
export const GRAPHQL_REQUEST_SENT: RequestItem = {
    ...GRAPHQL_REQUEST,
    settings: DEFAULT_REQUEST_SETTINGS,
};

/** The schema kept for that server, with the one type `Query`. */
export const GRAPHQL_CACHE = graphqlSchemaCacheSchema.parse({
    fetchedAt: '2026-09-01T10:00:00.000Z',
    introspection: introspectionFromSchema(buildSchema('type Query { a: Int }')),
});
