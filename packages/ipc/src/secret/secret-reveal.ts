import { slugSchema, variableNameSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * The one way a secret value travels towards the renderer, and it travels one at a time and
 * only because the owner asked for it by name. `null` is a variable that is declared here and
 * has no value on this machine, which is a normal state and not a refusal.
 */
const revealedSecretSchema = z.object({ value: z.string().nullable() }).strict();

export const secretRevealRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema,
    name: variableNameSchema,
});
export const secretRevealResultSchema = resultSchema(revealedSecretSchema);

export type RevealedSecret = z.infer<typeof revealedSecretSchema>;
export type SecretRevealRequest = z.infer<typeof secretRevealRequestSchema>;
