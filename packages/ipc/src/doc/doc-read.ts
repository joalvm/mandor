import { docNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** The name is the whole file name, extension included: a doc is not addressed by an id. */
export const docReadRequestSchema = z.object({
    workspaceId: slugSchema,
    name: docNameSchema,
});

export type DocReadRequest = z.infer<typeof docReadRequestSchema>;

/** The text of the doc, as it is on disk. */
export const docReadResultSchema = resultSchema(z.string());
