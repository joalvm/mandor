import { IdError } from '../id/id-error.js';
import { MAX_SEGMENT_LENGTH } from '../id/segment.js';

/** Docs are markdown and only markdown: what the viewer renders is what the extension promises. */
export const DOC_EXTENSION = '.md';

/** Control characters, both separators, and the rest of what three filesystems refuse. */
const FORBIDDEN_IN_NAME = /[\p{Cc}"*/:<>?\\|]/u;

/**
 * One markdown file of `docs/`, named the way a person names a document: spaces and accents
 * are fine, a second level of path is not.
 *
 * It is not an id segment. An id is chosen by Mandor and reads `notas-de-la-api`; this is a
 * file name the user typed, extension included, and the two rules cannot be the same one.
 * A leading dot is out because a doc nobody can see in their file manager is not a doc.
 */
export function isDocName(value: string): boolean {
    return (
        value.length > DOC_EXTENSION.length &&
        value.length <= MAX_SEGMENT_LENGTH &&
        value.endsWith(DOC_EXTENSION) &&
        !value.startsWith('.') &&
        !FORBIDDEN_IN_NAME.test(value)
    );
}

/** Throws unless the name is one markdown file of the workspace. */
export function assertDocName(value: string): void {
    if (!isDocName(value)) {
        throw new IdError(value);
    }
}
