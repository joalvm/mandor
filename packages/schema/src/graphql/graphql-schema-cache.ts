import { z } from 'zod';

/**
 * The schema a GraphQL server published when asked, kept as the introspection it answered with.
 * The body of the answer is the server's and may carry keys this version does not know, so the
 * objects are loose: what is read is written back as it came.
 */
export const graphqlSchemaCacheSchema = z
    .object({
        fetchedAt: z.iso.datetime(),
        introspection: z.looseObject({ __schema: z.looseObject({}) }),
    })
    .strict();

export type GraphqlSchemaCache = z.infer<typeof graphqlSchemaCacheSchema>;
