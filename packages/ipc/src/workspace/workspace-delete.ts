import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** Deleting is asked by id: the renderer confirms by name, main resolves by id. */
export const workspaceDeleteRequestSchema = z.object({ id: slugSchema }).strict();

export type WorkspaceDeleteRequest = z.infer<typeof workspaceDeleteRequestSchema>;
