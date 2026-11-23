import type { ListedVariable } from '@mandor/env';
import type { RequestLine } from '@mandor/schema';
import { sampleOf, sentHeaderNames, type ScriptContext } from '@mandor/script';

import type { ActivityEntry, ConnectionMessageEntry } from '../../../activity/activity-entry.js';

/** What a connection knows that the editor of its scripts completes with. */
export type ConnectionScriptPlace = {
    /** The headers of the handshake, as the headers table keeps them. */
    headers: readonly RequestLine[];
    /** The text of the last frame the connection received, as `lastReceivedText` reads it. */
    received: string | undefined;
    /** What the connection resolves and its scripts declare, a secret already masked. */
    variables: readonly ListedVariable[];
};

function isReceived(entry: ActivityEntry): entry is ConnectionMessageEntry {
    return entry.kind === 'connection-message' && entry.detail.direction === 'in';
}

/**
 * The text of the last frame the connection received. One that arrived as bytes is no text to
 * read a shape from, so it gives none, even when an older frame was text.
 */
export function lastReceivedText(entries: readonly ActivityEntry[]): string | undefined {
    const last = entries.findLast(isReceived);

    if (last === undefined || last.detail.binary === true) {
        return undefined;
    }

    return last.detail.data;
}

/**
 * The context of the scripts of a connection: the variables of its environment and the ones its
 * scripts declare; the names of the handshake headers it sends; and as a sample, the last frame
 * it received, when that one is JSON.
 */
export function connectionScriptContextOf(place: ConnectionScriptPlace): ScriptContext {
    return {
        headers: sentHeaderNames(place.headers),
        sample: sampleOf(place.received),
        variables: place.variables,
    };
}
