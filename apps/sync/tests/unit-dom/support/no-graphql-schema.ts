import type { GraphqlSchemaAsk } from '../../../src/renderer/features/requests/hooks/useGraphqlSchema.js';

/** What an editor whose server has never been asked is handed. */
export const NO_GRAPHQL_SCHEMA: GraphqlSchemaAsk = {
    facts: { cache: null, error: null, loading: false },
    refresh: () => undefined,
};
