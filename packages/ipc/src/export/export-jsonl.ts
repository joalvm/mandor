import { z } from 'zod';

import type { Result } from '../result/result.js';
import { resultSchema } from '../result/result-schema.js';

/**
 * One record of whatever the user was looking at. The contract does not name its fields: the
 * exporter writes lines, and what a line means belongs to the app that asked for the export.
 */
const exportRecordSchema = z.record(z.string(), z.unknown());

export const exportJsonlRequestSchema = z.object({
    /** What the dialog of the system offers as a name. The user decides the rest of the path. */
    suggestedName: z.string().min(1),
    records: z.array(exportRecordSchema),
});

/** `null` is the user closing the dialog: nothing was written, and nothing went wrong. */
export const exportedFileSchema = z.object({ path: z.string().nullable() }).strict();
export const exportJsonlResultSchema = resultSchema(exportedFileSchema);

export type ExportRecord = z.infer<typeof exportRecordSchema>;
export type ExportJsonlRequest = z.infer<typeof exportJsonlRequestSchema>;
export type ExportedFile = z.infer<typeof exportedFileSchema>;

/**
 * The export of what a window was looking at, line by line. Only Async writes one, so its app
 * adds it to the export area of the core; the core exports documents and nothing else.
 */
export type JsonlExportArea = {
    /** Writes what the caller holds to a file the user picks. Every line leaves redacted. */
    jsonl: (input: ExportJsonlRequest) => Promise<Result<ExportedFile>>;
};
