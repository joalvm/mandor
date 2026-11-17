import type { HistoryEntry, HttpResponse } from '@mandor/schema';

/** The answer a stored send got, or nothing when it ended without one. */
export function answerOf(entry: HistoryEntry): HttpResponse | null {
    if (entry.outcome.kind !== 'response') {
        return null;
    }

    return entry.outcome.response;
}
