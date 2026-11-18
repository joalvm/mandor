import { slugSchema, variableNameSchema } from '@mandor/schema';
import { z } from 'zod';

export const secretSetRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema,
    name: variableNameSchema,
    value: z.string(),
});

export type SecretSetRequest = z.infer<typeof secretSetRequestSchema>;
