import type { HistorySummary } from '@mandor/schema';

/**
 * The requests that sent something, each once, in the order the list meets them. A send of a
 * request saved nowhere names none, so there is nothing to pick it by.
 */
export function requestPathsOf(summaries: readonly HistorySummary[]): string[] {
    return [...new Set(summaries.flatMap((summary) => summary.itemPath ?? []))];
}
