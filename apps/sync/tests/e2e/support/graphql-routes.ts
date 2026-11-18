import type { IncomingMessage, ServerResponse } from 'node:http';

import { buildSchema, graphql } from 'graphql';

import { bodyOf } from './request-body.js';

const GRAPHQL_SCHEMA = buildSchema(
    'type Query { user(id: ID!): User } type User { id: ID! name: String } type Subscription { tick: Int }',
);

/** The user `2` has no name to give: asking for it is what makes an answer of 200 carry an error. */
const GRAPHQL_ROOT = {
    user: ({ id }: { id: string }) => ({
        id,
        name: () => {
            if (id === '2') {
                throw new Error('no name for this user');
            }

            return `user ${id}`;
        },
    }),
};

/** The endpoint of the small schema: it answers what it is asked and notes the query. */
export async function serveGraphql(
    request: IncomingMessage,
    response: ServerResponse,
    seen: string[],
): Promise<void> {
    const sent = JSON.parse(await bodyOf(request)) as {
        operationName?: string;
        query: string;
        variables?: Record<string, unknown>;
    };

    seen.push(sent.query);
    response.setHeader('Content-Type', 'application/json');
    response.end(
        JSON.stringify(
            await graphql({
                operationName: sent.operationName,
                rootValue: GRAPHQL_ROOT,
                schema: GRAPHQL_SCHEMA,
                source: sent.query,
                variableValues: sent.variables,
            }),
        ),
    );
}
