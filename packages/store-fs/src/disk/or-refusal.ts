import { FileReadError } from './file-read-error.js';

/**
 * Runs the work over a file that exists and turns whatever it throws into the refusal of that
 * file: a text that cannot be read is not a text to write over, and the caller learns which
 * file it was.
 */
export function orRefusal<T>(path: string, work: () => T): T {
    try {
        return work();
    } catch (error) {
        throw new FileReadError({ path, message: String(error) });
    }
}
