import { originSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** A new origin is named and located by the user; the id and the kind are derived in main. */
export const originAddRequestSchema = z
    .object({ name: z.string().trim().min(1), url: z.string().trim().min(1) })
    .strict();

export const originAddResultSchema = resultSchema(originSchema);

export type OriginAddRequest = z.infer<typeof originAddRequestSchema>;
