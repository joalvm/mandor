import { operationsOf } from '@mandor/graphql';
import type { RequestBody } from '@mandor/schema';

/** The body of a GraphQL request: a query, its variables and, at times, the operation it runs. */
export type GraphqlBodyValue = Extract<RequestBody, { type: 'graphql' }>;

/** The body the query leaves behind: a name that no longer exists in the document goes too. */
export function withGraphqlQuery(body: GraphqlBodyValue, query: string): GraphqlBodyValue {
    const parsed = operationsOf(query);
    const stale =
        body.operationName !== undefined &&
        parsed.ok &&
        !parsed.operations.some(({ name }) => name === body.operationName);

    if (!stale) {
        return { ...body, query };
    }

    return { query, type: 'graphql', variables: body.variables };
}
