import { rm } from 'node:fs/promises';

import { bodyFile } from './body-path.js';

/** Deletes stored bodies by hash. One that is already gone is what the caller wanted. */
export async function removeBodies(root: string, refs: readonly string[]): Promise<void> {
    const files = refs.map((ref) => bodyFile(root, ref));

    await Promise.all(files.map((file) => rm(file, { force: true })));
}
