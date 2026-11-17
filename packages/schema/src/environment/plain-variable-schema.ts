import type { z } from 'zod';

import { variableSchema } from './variable-schema.js';

/**
 * A variable whose file goes to git: a workspace's, a collection's or a folder's. Nothing here
 * can be secret — a secret is the per-machine value of a shared name, and it lives in an
 * environment.
 */
export const plainVariableSchema = variableSchema.refine((variable) => !variable.secret, {
    error: 'A variable that goes to git cannot be secret',
});

export type PlainVariable = z.infer<typeof plainVariableSchema>;
