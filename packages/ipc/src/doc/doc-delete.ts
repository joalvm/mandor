import { docNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** One markdown file of the workspace to remove, addressed by its name on disk. */
export const docDeleteRequestSchema = z.object({
    workspaceId: slugSchema,
    name: docNameSchema,
});

export type DocDeleteRequest = z.infer<typeof docDeleteRequestSchema>;
