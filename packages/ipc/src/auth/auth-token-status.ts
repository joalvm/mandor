import { authConfigSchema, collectionPathSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The place a token belongs to, as the three channels of a token name it: the workspace, the
 * environment the person works against, and the chain above the level being edited. `own` is
 * the level itself, as the editor holds it, so a token can be asked for before it is saved.
 */
export const authTokenRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema.nullable(),
    own: authConfigSchema.optional(),
    parentPath: collectionPathSchema.nullable(),
});

/**
 * What the window may know about a token, and never the token: whether there is one, if it still
 * serves, when it stops, and whether it only lives in memory because the machine has no keychain.
 */
export const authTokenStatusSchema = z
    .object({
        state: z.enum(['none', 'valid', 'expired', 'memory-only']),
        expiresAt: z.string().nullable(),
    })
    .strict();

export type AuthTokenRequest = z.infer<typeof authTokenRequestSchema>;
export type AuthTokenStatus = z.infer<typeof authTokenStatusSchema>;

/** What asking for the status of a token and fetching one both answer with. */
export const authTokenStatusResultSchema = resultSchema(authTokenStatusSchema);
