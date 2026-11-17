import type { HistoryEntry } from '@mandor/schema';

/** The two sends with the one that left first first, so a comparison always reads old to new. */
export function inSentOrder(
    a: HistoryEntry,
    b: HistoryEntry,
): readonly [HistoryEntry, HistoryEntry] {
    return a.sentAt <= b.sentAt ? [a, b] : [b, a];
}
