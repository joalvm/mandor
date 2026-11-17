import { type ConflictRecord, conflictRecordSchema } from '@mandor/schema';

import type { LoadWarning } from '../disk/load-warning.js';
import { readFileText } from '../disk/read-file-text.js';

export type ConflictRead =
    { ok: true; record: ConflictRecord } | { ok: false; warning: LoadWarning };

/** Reads one record file. One that cannot be read or parsed is a warning, never a throw. */
export async function readConflictFile(path: string): Promise<ConflictRead> {
    try {
        const contents: unknown = JSON.parse(await readFileText(path));

        return { ok: true, record: conflictRecordSchema.parse(contents) };
    } catch (error) {
        return { ok: false, warning: { path, message: String(error) } };
    }
}
