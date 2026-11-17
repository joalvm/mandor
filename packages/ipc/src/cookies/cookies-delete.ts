import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** Deletes one cookie of the jar, named by its domain, path and name. */
export const cookiesDeleteRequestSchema = z
    .object({
        workspaceId: slugSchema,
        environmentId: slugSchema.nullable(),
        domain: z.string().min(1),
        path: z.string().min(1),
        name: z.string().min(1),
    })
    .strict();

export type CookiesDeleteRequest = z.infer<typeof cookiesDeleteRequestSchema>;
