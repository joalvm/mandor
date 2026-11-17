import { z } from 'zod';

import { SEGMENT } from '../id/segment-pattern.js';

const segment = z.string().regex(SEGMENT);

/**
 * What changed on disk, named the way the window names things, so a listener can tell whether
 * the thing it shows is affected without knowing where any file lives. A collection `path` is
 * the item or folder; the empty path is the root of the collection.
 */
export const changedEntitySchema = z.discriminatedUnion('area', [
    z.object({ area: z.literal('repo') }).strict(),
    z.object({ area: z.literal('globals') }).strict(),
    z.object({ area: z.literal('workspace'), workspaceId: segment }).strict(),
    z.object({ area: z.literal('collections'), workspaceId: segment, path: z.string() }).strict(),
    z.object({ area: z.literal('doc'), workspaceId: segment, name: z.string().min(1) }).strict(),
    z.object({ area: z.literal('environment'), workspaceId: segment, id: segment }).strict(),
    z.object({ area: z.literal('connection'), workspaceId: segment, id: segment }).strict(),
]);

export type ChangedEntity = z.infer<typeof changedEntitySchema>;
