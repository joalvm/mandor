import type { WsScriptNote } from '@mandor/ipc';

import type { NewActivityEntry } from '../../../activity/activity-entry.js';

/** A note with nothing in it: a run that wrote, tested, set, dropped and broke nothing. */
function saysNothing(note: WsScriptNote): boolean {
    const lists = [note.logs, note.tests, note.skipped, note.variables, note.withheld];
    const counts = [note.dropped, note.switchedOff];

    return (
        lists.every((list) => list.length === 0) &&
        counts.every((count) => count === 0) &&
        note.secretsOff === undefined &&
        note.error === undefined
    );
}

/**
 * The line a note of the scripts writes on the timeline, or nothing for a note that says
 * nothing: a quiet `onMessage` would otherwise draw a line a second. It weighs against the cap
 * of the buffer what its text weighs, as a frame weighs what it carried.
 */
export function connectionScriptEntry(note: WsScriptNote): NewActivityEntry | undefined {
    if (saysNothing(note)) {
        return undefined;
    }

    return {
        at: note.at,
        bytes: JSON.stringify(note).length,
        detail: note,
        kind: 'connection-script',
    };
}
