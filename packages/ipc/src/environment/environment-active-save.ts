import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

export const environmentActiveSaveRequestSchema = z.object({
    workspaceId: slugSchema,
    environmentId: slugSchema.nullable(),
});

export type EnvironmentActiveSaveRequest = z.infer<typeof environmentActiveSaveRequestSchema>;
