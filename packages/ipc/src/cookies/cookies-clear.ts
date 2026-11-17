import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** Empties the jar of one environment: the next send of it goes out with no cookie of the jar. */
export const cookiesClearRequestSchema = z
    .object({ workspaceId: slugSchema, environmentId: slugSchema.nullable() })
    .strict();

export type CookiesClearRequest = z.infer<typeof cookiesClearRequestSchema>;
