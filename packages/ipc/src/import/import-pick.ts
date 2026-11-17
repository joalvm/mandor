import { INTEROP_INPUTS } from '@mandor/interop-core';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';
import { importFileSchema } from './import-file.js';

// Choosing happens in main, with the open dialog of the operating system: the renderer never
// names a path. It only says what it wants the person to pick — a file, several, a folder — and
// the files come back read, with the paths they have under what was picked. Cancelled is not an
// error, so the files travel as nullable.
export const importPickRequestSchema = z.object({ input: z.enum(INTEROP_INPUTS) }).strict();

export type ImportPickRequest = z.infer<typeof importPickRequestSchema>;

export const importPickedSchema = z.object({
    files: z.array(importFileSchema).nullable(),
});

export type ImportPicked = z.infer<typeof importPickedSchema>;

export const importPickResultSchema = resultSchema(importPickedSchema);
