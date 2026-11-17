import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** What one check of a remote origin answers: it reached the refs, or it did not. */
const originCheckSchema = z.object({ id: slugSchema, reachable: z.boolean() }).strict();

/** Asking for the state of one origin. Only remotes are asked; the local one is always there. */
export const originCheckRequestSchema = z.object({ id: slugSchema }).strict();

export const originCheckResultSchema = resultSchema(originCheckSchema);

export type OriginCheckRequest = z.infer<typeof originCheckRequestSchema>;
export type OriginCheck = z.infer<typeof originCheckSchema>;
