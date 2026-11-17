import { app } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const FILE_NAME = 'last-directory.json';

/**
 * Where the dialogs of the system open: the folder the user was last in, once there is one.
 * Other apps remember it and this one did not, which read as the machine forgetting the user's
 * work. The memory lives in the data of the app on this machine — a path is not a secret, and
 * it is never the repo's business.
 */
export async function lastDirectory(): Promise<string | undefined> {
    try {
        const read: unknown = JSON.parse(await readFile(file(), 'utf8'));

        return lastOf(read);
    } catch {
        return undefined;
    }
}

/** Remembers the folder of a path the user actually chose. Losing the memory is not an error. */
export async function rememberLastDirectory(path: string): Promise<void> {
    try {
        await writeFile(file(), JSON.stringify({ last: dirname(path) }), 'utf8');
    } catch {
        // The next dialog simply opens where it would have anyway.
    }
}

function lastOf(read: unknown): string | undefined {
    if (typeof read !== 'object' || read === null || !('last' in read)) {
        return undefined;
    }

    return typeof read.last === 'string' && read.last !== '' ? read.last : undefined;
}

function file(): string {
    return join(app.getPath('userData'), FILE_NAME);
}
