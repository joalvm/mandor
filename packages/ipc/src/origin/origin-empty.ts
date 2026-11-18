import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** Emptying an origin is asked by id: the renderer confirms by name, main resolves by id. */
export const originEmptyRequestSchema = z.object({ id: slugSchema }).strict();

export type OriginEmptyRequest = z.infer<typeof originEmptyRequestSchema>;
