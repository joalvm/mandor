import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * Starts writing the activity of one connection to a path the user already picked. The path
 * travels in the request because the asking happened before it: main never opens a save dialog
 * behind the caller's back, and a recording without one never starts.
 */
export const recordStartRequestSchema = z.object({
    connectionId: slugSchema,
    path: z.string().min(1),
});

export type RecordStartRequest = z.infer<typeof recordStartRequestSchema>;
