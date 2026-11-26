import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Empties the jar of one environment, or only the cookies of one of its domains: the next send
 * goes out without what was taken.
 */
export const cookiesClearRequestSchema = z
    .object({
        workspaceId: slugSchema,
        environmentId: slugSchema.nullable(),
        domain: z.string().min(1).optional(),
    })
    .strict();

export type CookiesClearRequest = z.infer<typeof cookiesClearRequestSchema>;
