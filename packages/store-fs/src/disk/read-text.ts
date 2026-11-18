import { isMissing } from './is-missing.js';
import { readFileText } from './read-file-text.js';

/**
 * The text of a file, or `null` when there is no file. Any other failure is a real one — a
 * folder where a file should be, a refused permission — and reaches the caller as it left the
 * disk: «not there» and «could not be read» must not look the same to a merge.
 */
export async function readTextOrNull(path: string): Promise<string | null> {
    try {
        return await readFileText(path);
    } catch (error) {
        if (isMissing(error)) {
            return null;
        }

        throw error;
    }
}
