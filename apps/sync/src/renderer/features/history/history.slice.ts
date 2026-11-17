import type { HistorySummary } from '@mandor/schema';

/** What the history of one workspace keeps while the window is open. */
export type WorkspaceHistory = {
    /** Only the sends of this request, or all of them. */
    filterItemPath: string | null;
    /** Whether the list was read from disk, so «nothing yet» never shows before the answer. */
    loaded: boolean;
    /** The send the detail shows. */
    openId: string | null;
    /** The sends picked to compare or delete: never more than two. */
    selected: string[];
    /** Newest first, as the list gives them and as a push adds them. */
    summaries: HistorySummary[];
};

export type HistorySlice = {
    /** Filed under the workspace, so switching one and coming back finds the list as it was. */
    workspaces: Record<string, WorkspaceHistory>;
};

/** One value for every workspace that was never opened, so reading it never repaints. */
export const NO_HISTORY: WorkspaceHistory = {
    filterItemPath: null,
    loaded: false,
    openId: null,
    selected: [],
    summaries: [],
};

export function initialHistorySlice(): HistorySlice {
    return { workspaces: {} };
}
