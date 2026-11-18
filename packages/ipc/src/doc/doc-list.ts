import { docNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

export const docListRequestSchema = z.object({
    workspaceId: slugSchema,
});

export type DocListRequest = z.infer<typeof docListRequestSchema>;

/** One doc of the list: the file it is stored in, and the title a person reads for it. */
const listedDocSchema = z.object({
    name: docNameSchema,
    title: z.string(),
});

export type ListedDoc = z.infer<typeof listedDocSchema>;

/** The docs of the workspace, by title. */
export const docListResultSchema = resultSchema(z.array(listedDocSchema));
