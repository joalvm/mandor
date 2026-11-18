import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Changes the value of one cookie the jar already holds. The cookie is named by its domain, path
 * and name; a cookie that is not there is refused, because the window edits what a server set and
 * does not make cookies up.
 */
export const cookiesSetRequestSchema = z
    .object({
        workspaceId: slugSchema,
        environmentId: slugSchema.nullable(),
        domain: z.string().min(1),
        path: z.string().min(1),
        name: z.string().min(1),
        value: z.string(),
    })
    .strict();

export type CookiesSetRequest = z.infer<typeof cookiesSetRequestSchema>;
