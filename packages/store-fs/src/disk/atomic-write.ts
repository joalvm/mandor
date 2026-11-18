import { randomUUID } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';

import { renameWithRetry } from './rename-with-retry.js';

/** The temporary is a sibling so the rename stays inside one filesystem, where it is atomic. */
const TEMPORARY_SUFFIX = '.tmp';

/**
 * Replaces a file through a sibling temporary. A reader arriving mid-write sees either the
 * previous bytes or the new ones, never a truncated file, and a crash costs nothing already
 * on disk. Every write in this package goes through here.
 */
export async function atomicWrite(path: string, contents: string): Promise<void> {
    // One temporary per write: two saves of the same file in flight would otherwise write into
    // one temporary at once, and the rename could carry the bytes of both.
    const temporary = `${path}.${randomUUID()}${TEMPORARY_SUFFIX}`;

    // The temporary sits inside a tree that syncs: whatever fails, it does not stay behind.
    try {
        await writeThrough(temporary, contents);
        await renameWithRetry(temporary, path);
    } catch (error) {
        await unlink(temporary).catch(() => undefined);

        throw error;
    }
}

/** `fsync` before the rename, or the rename can land while the bytes are still in cache. */
async function writeThrough(temporary: string, contents: string): Promise<void> {
    const handle = await open(temporary, 'w');

    try {
        await handle.writeFile(contents, 'utf8');
        await handle.sync();
    } finally {
        await handle.close();
    }
}
