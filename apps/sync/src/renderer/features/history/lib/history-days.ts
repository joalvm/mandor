import type { HistorySummary } from '@mandor/schema';

export type HistoryDay = { day: string; summaries: HistorySummary[] };

/** The calendar day of a moment in the zone of the person, as `YYYY-MM-DD`. */
function dayOf(sentAt: string): string {
    const date = new Date(sentAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${String(date.getFullYear())}-${month}-${day}`;
}

/**
 * The sends grouped by the day they left, in the order they came: the list is newest first, so
 * the days are too. A day is the one the person lived, not the one of UTC, which is why it is
 * worked out here and not in the file name that sorts the disk.
 */
export function historyDays(summaries: readonly HistorySummary[]): HistoryDay[] {
    const days: HistoryDay[] = [];

    for (const summary of summaries) {
        const day = dayOf(summary.sentAt);
        const last = days.at(-1);

        if (last?.day === day) {
            last.summaries.push(summary);
        } else {
            days.push({ day, summaries: [summary] });
        }
    }

    return days;
}
