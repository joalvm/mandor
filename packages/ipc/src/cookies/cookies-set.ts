import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** What names one cookie of a jar: no two cookies of it share all three. */
const cookieIdentitySchema = z
    .object({ domain: z.string().min(1), path: z.string().min(1), name: z.string().min(1) })
    .strict();

/**
 * Writes one cookie into the jar from a `Set-Cookie` line, as if a server of `domain` had sent it:
 * a line without `Domain` stays on that host alone, one without `Path` lives at `/`. `replaces`
 * names the cookie the line was opened from; when the line names another cookie, that one goes,
 * so renaming a cookie leaves no copy of the old one behind.
 */
export const cookiesSetRequestSchema = z
    .object({
        workspaceId: slugSchema,
        environmentId: slugSchema.nullable(),
        domain: z.string().min(1),
        line: z.string().min(1),
        replaces: cookieIdentitySchema.optional(),
    })
    .strict();

export type CookiesSetRequest = z.infer<typeof cookiesSetRequestSchema>;
