import { graphqlSchemaCacheSchema } from '@mandor/schema';
import type { z } from 'zod';

import { requestSendRequestSchema } from '../request/request-send.js';
import { resultSchema } from '../result/result-schema.js';

/**
 * Asks the server for its schema with the request on screen: the same url, headers and
 * environment as a send, so whatever lets the request in lets the question in. It is `request:send`
 * without the id of the send, because an introspection is not one: it never reaches the history
 * and runs no script.
 */
export const graphqlIntrospectRequestSchema = requestSendRequestSchema.omit({
    sendId: true,
    skipScripts: true,
});

export const graphqlIntrospectResultSchema = resultSchema(graphqlSchemaCacheSchema);

export type GraphqlIntrospectRequest = z.infer<typeof graphqlIntrospectRequestSchema>;
