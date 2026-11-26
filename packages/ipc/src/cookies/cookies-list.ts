import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * One cookie of the jar as the window sees it. `domain`, `path` and `name` are what identify it:
 * two jars of two environments never share a row. `expires` is ISO 8601, or `null` for a cookie
 * of the session. `line` is the whole cookie as a `Set-Cookie` line, the text its editor opens
 * with and hands back to `cookies:set`.
 */
export const cookieRowSchema = z
    .object({
        line: z.string(),
        domain: z.string(),
        path: z.string(),
        name: z.string(),
        value: z.string(),
        expires: z.string().nullable(),
        httpOnly: z.boolean(),
        secure: z.boolean(),
        sameSite: z.enum(['strict', 'lax', 'none']).nullable(),
    })
    .strict();

/** The jar of one environment, or of the workspace without one when `environmentId` is `null`. */
export const cookiesListRequestSchema = z
    .object({ workspaceId: slugSchema, environmentId: slugSchema.nullable() })
    .strict();

export const cookiesListResultSchema = resultSchema(
    z.object({ cookies: z.array(cookieRowSchema) }).strict(),
);

export type CookieRow = z.infer<typeof cookieRowSchema>;
export type CookiesListRequest = z.infer<typeof cookiesListRequestSchema>;
