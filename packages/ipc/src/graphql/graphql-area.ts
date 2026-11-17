import type { GraphqlSchemaCache } from '@mandor/schema';

import type { Result } from '../result/result.js';
import type { GraphqlIntrospectRequest } from './graphql-introspect.js';
import type { GraphqlSchemaReadRequest } from './graphql-schema-read.js';

/**
 * The schema of the server a request points at: read what is kept, or ask for it again. Only
 * Sync serves it, so it sits beside its channels.
 */
export type GraphqlArea = {
    /** The schema kept for this request, or `null` when none was fetched. */
    readSchema: (input: GraphqlSchemaReadRequest) => Promise<Result<GraphqlSchemaCache | null>>;
    /** Asks the server for its schema, keeps the answer and returns it. */
    introspect: (input: GraphqlIntrospectRequest) => Promise<Result<GraphqlSchemaCache>>;
};
