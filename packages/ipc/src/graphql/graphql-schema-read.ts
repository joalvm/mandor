import { graphqlSchemaCacheSchema } from '@mandor/schema';
import type { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
import { graphqlIntrospectRequestSchema } from './graphql-introspect.js';

/**
 * Reads the schema kept for what the request points at, without asking the server: the window
 * does it on opening, so the editor can suggest before anyone sends anything. The answer is
 * `null` when none was ever fetched, which is not a failure.
 */
export const graphqlSchemaReadRequestSchema = graphqlIntrospectRequestSchema;

export const graphqlSchemaReadResultSchema = resultSchema(graphqlSchemaCacheSchema.nullable());

export type GraphqlSchemaReadRequest = z.infer<typeof graphqlSchemaReadRequestSchema>;
