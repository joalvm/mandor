import { authConfigSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Writes the auth of the workspace. `null` is the deliberate answer: it takes the key out of the
 * file. The auth of a collection or a folder goes with the rest of its settings.
 */
export const authWriteRequestSchema = z
    .object({
        workspaceId: slugSchema,
        auth: authConfigSchema.nullable(),
    })
    .strict();

export type AuthWriteRequest = z.infer<typeof authWriteRequestSchema>;
