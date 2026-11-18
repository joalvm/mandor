import type { WsScriptNote } from '@mandor/ipc';

import { pickByKind, type ActivityEntry, type ByEntryKind } from './activity-entry.js';
import { messageSearchText } from './lib/message-search-text.js';

/** What the scripts wrote themselves, by the moment they ran: what main said has no text of its own. */
function scriptText(note: WsScriptNote): string {
    const written = note.logs.flatMap((log) => ('text' in log ? [log.text] : []));
    const error = note.error === undefined ? [] : [note.error.errorName, note.error.message];

    return [note.event, ...written, ...note.tests.map((test) => test.name), ...error].join(' ');
}

const TEXT_OF_KIND: ByEntryKind<string> = {
    'connection-message': (entry) => messageSearchText(entry.detail),
    'connection-fault': (entry) => entry.detail.code,
    'connection-status': (entry) => entry.detail.status,
    'connection-script': (entry) => scriptText(entry.detail),
};

/**
 * The text an entry carries to the search of the timeline and to the export: what a frame said,
 * the code a fault failed with, whether the socket came up or went down, or what its scripts
 * wrote. Both read the same text, so the file shows what the row did.
 */
export function activityText(entry: ActivityEntry): string {
    return pickByKind(TEXT_OF_KIND, entry);
}
