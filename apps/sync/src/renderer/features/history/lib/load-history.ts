import type { ErrorCode } from '@mandor/ipc';

import { syncBridge } from '../../../app/sync-bridge.js';
import { historyStore } from '../history-store.js';

/** Workspaces with a read in flight: a second tab asks nothing and waits for the first. */
const READING = new Set<string>();

/**
 * Brings the list of a workspace off disk, once. After that the pushes keep it current, so
 * opening the tab again is a draw and not a read. A send that was pushed while the read was on
 * its way is newer than the read and stays on top of it.
 */
export async function loadHistory(workspaceId: string): Promise<ErrorCode | null> {
    if (historyStore.getState().workspaces[workspaceId]?.loaded === true) {
        return null;
    }

    if (READING.has(workspaceId)) {
        return null;
    }

    READING.add(workspaceId);

    try {
        const result = await syncBridge.history.list({ workspaceId });

        if (!result.ok) {
            return result.error.code;
        }

        const listed = new Set(result.value.entries.map((entry) => entry.id));
        const late = (historyStore.getState().workspaces[workspaceId]?.summaries ?? []).filter(
            (summary) => !listed.has(summary.id),
        );

        historyStore.getState().setSummaries(workspaceId, [...late, ...result.value.entries]);

        return null;
    } finally {
        READING.delete(workspaceId);
    }
}
