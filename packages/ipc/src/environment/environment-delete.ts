import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

export const environmentDeleteRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema,
});

export type EnvironmentDeleteRequest = z.infer<typeof environmentDeleteRequestSchema>;
