import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';

import { isMissing } from './is-missing.js';

/**
 * The entries of a folder, or none when it does not exist yet: a workspace nobody wrote docs,
 * history or conflicts in has no folder for them, and that is not a failure. Any other failure
 * reaches the caller, because a folder that could not be read is not an empty one: a new name
 * picked against it could land on a file that is there.
 */
export async function entriesOrNone(path: string): Promise<Dirent[]> {
    try {
        return await readdir(path, { withFileTypes: true });
    } catch (error) {
        if (isMissing(error)) {
            return [];
        }

        throw error;
    }
}

/** The names in a folder, or none when it does not exist yet; see `entriesOrNone`. */
export async function namesOrNone(path: string): Promise<string[]> {
    const entries = await entriesOrNone(path);

    return entries.map((entry) => entry.name);
}
