import type { ExportRecord } from '@mandor/ipc';

import { redactMessage } from '@mandor/host';

/**
 * A batch of records as one line of JSON each, with every secret of the session already
 * hidden. A file the user takes out of Mandor —into a ticket, a chat, a bug report— is the
 * border that leaks quietest, so the redaction happens here and not where the export is asked
 * for: nothing that writes a line has to remember to do it.
 *
 * The serialiser does not know what a record is. Activity of a socket, a request and its
 * response: the part that knows lives in the app, and it hands the objects over already shaped.
 */
export function redactedJsonl(records: readonly ExportRecord[]): string {
    return records.map((record) => `${JSON.stringify(redactMessage(record))}\n`).join('');
}
