import type { ErrorCode } from '@mandor/ipc';

import { syncBridge } from '../../../app/sync-bridge.js';
import { historyStore } from '../history-store.js';

/** What leaves the history: the sends it names, or all of them. */
export type HistoryRemoval = { all: true } | { ids: readonly [string, ...string[]] };

/**
 * Deletes sends from disk and, once disk says yes, from the list. The list never runs ahead of
 * the disk: a delete that failed leaves every row where it was, and says why.
 */
export async function removeHistory(
    workspaceId: string,
    removal: HistoryRemoval,
): Promise<ErrorCode | null> {
    const result = await syncBridge.history.remove(
        'all' in removal ? { all: true, workspaceId } : { ids: [...removal.ids], workspaceId },
    );

    if (!result.ok) {
        return result.error.code;
    }

    if ('all' in removal) {
        historyStore.getState().clear(workspaceId);
    } else {
        historyStore.getState().removeIds(workspaceId, removal.ids);
    }

    return null;
}
