import { resourceUriSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * One view of a resource inside a group. The title is not stored: the tab kind reads it off the
 * resource, and a copy of it here would start lying the first time the file is renamed.
 *
 * A tab opened only to look at what it holds says so, and only then: the next look replaces it,
 * and reopening the window leaves it as provisional as it was. A kept tab carries no mark, so a
 * session written before the mark existed reads as every tab kept.
 *
 * A pinned tab says so the same way: it stands before the rest of its group and no closing of
 * many takes it. Pinning is choosing, so a pinned tab is never also provisional.
 */
export const sessionTabSchema = z
    .object({
        id: z.string().trim().min(1),
        kind: z.string().trim().min(1),
        pinned: z.literal(true).optional(),
        preview: z.literal(true).optional(),
        resource: resourceUriSchema,
    })
    .strict();

export type SessionTab = z.infer<typeof sessionTabSchema>;
