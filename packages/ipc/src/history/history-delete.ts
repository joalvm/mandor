import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Deletes the sends it names, or all of them. Two shapes and never both: «all» is a different
 * promise from a list, and an empty list that deletes nothing is a mistake worth refusing.
 */
export const historyDeleteRequestSchema = z.union([
    z.object({ workspaceId: slugSchema, ids: z.array(z.uuid()).min(1) }).strict(),
    z.object({ workspaceId: slugSchema, all: z.literal(true) }).strict(),
]);

export type HistoryDeleteRequest = z.infer<typeof historyDeleteRequestSchema>;
