import { originSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** Renaming is asked by id, with the name the renderer already trimmed; `Local` never reaches here. */
export const originRenameRequestSchema = z
    .object({ id: slugSchema, name: z.string().trim().min(1) })
    .strict();

export const originRenameResultSchema = resultSchema(originSchema);

export type OriginRenameRequest = z.infer<typeof originRenameRequestSchema>;
