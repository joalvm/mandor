import { FileReadError } from './file-read-error.js';
import { type DocumentRead, readDocument } from './read-document.js';

/**
 * The reading half of every write: an operation that edits a file must load it first, and a
 * file it cannot load is a refusal, not a warning it can carry along.
 */
export async function readOrThrow<T>(
    path: string,
    parse: (input: unknown) => T,
): Promise<Extract<DocumentRead<T>, { ok: true }>> {
    const read = await readDocument(path, parse);

    if (!read.ok) {
        throw new FileReadError(read.warning);
    }

    return read;
}
