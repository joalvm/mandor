import { mkdir } from 'node:fs/promises';

import { type ConflictRecord, conflictRecordSchema } from '@mandor/schema';

import { atomicWrite } from '../disk/atomic-write.js';
import { conflictFile, conflictId, conflictsDir } from './conflict-path.js';

/**
 * Keeps a clash. A second clash on the same file replaces the first: the file has one open
 * question at a time, and the newer texts are the ones that describe it. Returns the id.
 */
export async function writeConflict(root: string, record: ConflictRecord): Promise<string> {
    const valid = conflictRecordSchema.parse(record);
    const id = conflictId(valid.path);

    await mkdir(conflictsDir(root), { recursive: true });
    await atomicWrite(conflictFile(root, id), `${JSON.stringify(valid, null, 4)}\n`);

    return id;
}
