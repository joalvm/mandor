import type { HistoryRemoval } from './remove-history.js';

/** What a question about deleting is about: the sends picked, or everything the workspace kept. */
export type HistoryDeletion = 'all' | 'selected';

/** What the answer deletes, or nothing when the question was about picks and none are left. */
export function removalOf(
    deleting: HistoryDeletion,
    selected: readonly string[],
): HistoryRemoval | null {
    if (deleting === 'all') {
        return { all: true };
    }

    const [first, ...rest] = selected;

    return first === undefined ? null : { ids: [first, ...rest] };
}
