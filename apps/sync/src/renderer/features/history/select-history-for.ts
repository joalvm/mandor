import { NO_HISTORY, type WorkspaceHistory } from './history.slice.js';
import type { HistoryStore } from './history-store.js';

/** The history of one workspace; the same empty one for every workspace that has none yet. */
export function selectHistoryFor(workspaceId: string): (state: HistoryStore) => WorkspaceHistory {
    return (state) => state.workspaces[workspaceId] ?? NO_HISTORY;
}
