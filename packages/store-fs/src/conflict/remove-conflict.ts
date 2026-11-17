import { rm } from 'node:fs/promises';

import { conflictFile } from './conflict-path.js';

/** Deletes the record of one id. One that is already gone is what the caller wanted. */
export async function removeConflict(root: string, id: string): Promise<void> {
    await rm(conflictFile(root, id), { force: true });
}
