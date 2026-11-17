import { slugSchema, variableNameSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * Which secret variables of an environment have a value on this machine. Names travel, values
 * do not: the tab needs to tell a filled secret from an empty one, and asking for the values
 * to find out is the question this contract exists to avoid.
 */
export const secretKeptRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema,
});
export const secretKeptResultSchema = resultSchema(z.array(variableNameSchema));

export type SecretKeptRequest = z.infer<typeof secretKeptRequestSchema>;
