import { slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
import { exportedFileSchema } from './export-jsonl.js';
import { exportScopeShape, namesItsCollection, SCOPE_DISAGREES } from './export-scope.js';

/**
 * The write: the workspace, the format and the scope of the outline, and the leaves the user left
 * marked. Main reads the workspace again, cuts it to those leaves, asks where to put the file — or
 * the folder, when the format writes several — and writes them redacted. The answer carries the
 * path and never the text; `null` is the user closing the dialog of the system.
 */
export const exportWriteRequestSchema = z
    .object({
        workspaceId: slugSchema,
        format: slugSchema,
        ...exportScopeShape,
        // Nothing chosen is nothing to write: the border refuses it, as the dialog does.
        chosen: z.array(z.string().min(1)).min(1),
    })
    .strict()
    .refine(namesItsCollection, SCOPE_DISAGREES);

export type ExportWriteRequest = z.infer<typeof exportWriteRequestSchema>;

export const exportWriteResultSchema = resultSchema(exportedFileSchema);
