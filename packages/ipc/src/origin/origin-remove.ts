import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** Removing is asked by id. The local origin is refused in main; the renderer never offers it. */
export const originRemoveRequestSchema = z.object({ id: slugSchema }).strict();

export type OriginRemoveRequest = z.infer<typeof originRemoveRequestSchema>;
