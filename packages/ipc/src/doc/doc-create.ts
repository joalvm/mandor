import { docNameSchema, entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * One more markdown file of the workspace, with the title the person typed. Main draws the file
 * name and no text travels: a doc is born with nothing in it and the editor is what fills it.
 */
export const docCreateRequestSchema = z.object({
    workspaceId: slugSchema,
    title: entityNameSchema,
});

export type DocCreateRequest = z.infer<typeof docCreateRequestSchema>;

/** The file name main drew for the doc, which is how the window opens it. */
export const docCreateResultSchema = resultSchema(docNameSchema);
