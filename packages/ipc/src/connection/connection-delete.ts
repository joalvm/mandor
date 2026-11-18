import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

export const connectionDeleteRequestSchema = z.object({
    workspaceId: slugSchema,
    connectionId: slugSchema,
});

export type ConnectionDeleteRequest = z.infer<typeof connectionDeleteRequestSchema>;
