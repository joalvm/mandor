import { createHash } from 'node:crypto';

/**
 * The identity of a document: the same text answers the same id, and that is what makes a
 * re-import an update instead of a duplicate. A reformatted document is another document; the
 * text is what the user brought, byte for byte.
 */
export function documentSourceId(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}
