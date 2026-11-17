import { type Connection, parseConnection } from '@mandor/schema';
import type { Document } from 'yaml';

import { documentTextWith } from '../disk/document-text.js';
import { parsedDocument } from '../disk/parsed-document.js';

/** What an edit may touch. The id is the file name: changing it is a move, not an update. */
export type ConnectionPatch = Partial<Omit<Connection, 'id'>>;

// Files from before the headers were lines kept the switched-off ones in a record of their own.
// Once the headers are written as lines that record says nothing the lines do not, so it goes.
const WITHOUT_LEGACY_HEADERS = { disabledHeaders: undefined };

/**
 * Applies a patch inside the loaded document, after the connection it makes has been validated:
 * a change the domain rejects leaves the file exactly as it was.
 */
export function editConnectionDocument(
    document: Document,
    current: Connection,
    changes: ConnectionPatch,
): { updated: Connection; text: string } {
    const updated = parseConnection({ ...current, ...changes });
    const written =
        changes.headers === undefined ? changes : { ...changes, ...WITHOUT_LEGACY_HEADERS };

    return { updated, text: documentTextWith(document, written) };
}

/** The text of a connection file once `changes` are in it; a text that is not one is a refusal. */
export function connectionTextWith(text: string, changes: ConnectionPatch): string {
    const document = parsedDocument(text);

    return editConnectionDocument(document, parseConnection(document.toJS()), changes).text;
}
