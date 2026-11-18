import { rename } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Windows refuses a rename of, or onto, a path another process has open for a moment: a watcher
 * or an antivirus reading what was just written. The refusal passes, so the rename is tried again.
 */
const TRANSIENT = new Set(['EPERM', 'EBUSY', 'EACCES']);
const ATTEMPTS = 6;
const BACKOFF_MS = 15;

/**
 * Renames a file or a directory, trying again for a moment while the system refuses it with a
 * refusal that passes. Any other refusal, or the last one, is the caller's.
 */
export async function renameWithRetry(from: string, to: string): Promise<void> {
    for (let attempt = 1; attempt < ATTEMPTS; attempt += 1) {
        const refusal = await renameOrRefusal(from, to);

        if (refusal === undefined) {
            return;
        }

        if (!TRANSIENT.has(String(refusal.code))) {
            throw refusal;
        }

        await sleep(BACKOFF_MS * attempt);
    }

    await rename(from, to);
}

async function renameOrRefusal(
    from: string,
    to: string,
): Promise<NodeJS.ErrnoException | undefined> {
    try {
        await rename(from, to);

        return undefined;
    } catch (error) {
        return error as NodeJS.ErrnoException;
    }
}
