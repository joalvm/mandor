import { docNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/**
 * Which doc goes back to its last commit. Nothing else travels: the renderer names the file and
 * main decides what its earlier text was, because the history is on the side that owns the disk.
 */
export const docRevertRequestSchema = z.object({
    workspaceId: slugSchema,
    name: docNameSchema,
});

export type DocRevertRequest = z.infer<typeof docRevertRequestSchema>;

/** The text the doc went back to, so the editor shows it without reading again. */
export const docRevertResultSchema = resultSchema(z.string());
