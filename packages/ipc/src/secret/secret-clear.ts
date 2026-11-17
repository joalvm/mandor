import { slugSchema, variableNameSchema } from '@mandor/schema';
import { z } from 'zod';

export const secretClearRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema,
    name: variableNameSchema,
});

export type SecretClearRequest = z.infer<typeof secretClearRequestSchema>;
