import type { HistorySummary } from '@mandor/schema';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import {
    initialHistorySlice,
    NO_HISTORY,
    type HistorySlice,
    type WorkspaceHistory,
} from './history.slice.js';

/** Two sends are what a comparison needs, and what the picks can hold. */
const MAX_SELECTED = 2;

type HistoryActions = {
    append: (workspaceId: string, summary: HistorySummary, removed: readonly string[]) => void;
    clear: (workspaceId: string) => void;
    removeIds: (workspaceId: string, ids: readonly string[]) => void;
    reset: () => void;
    setFilter: (workspaceId: string, itemPath: string | null) => void;
    setOpen: (workspaceId: string, id: string | null) => void;
    setSummaries: (workspaceId: string, summaries: HistorySummary[]) => void;
    toggleSelected: (workspaceId: string, id: string) => void;
};

export type HistoryStore = HistoryActions & HistorySlice;
export type HistoryStoreApi = StoreApi<HistoryStore>;

/** Applies a change to one workspace; one that changes nothing leaves the state as it was. */
function updated(
    set: HistoryStoreApi['setState'],
    workspaceId: string,
    change: (history: WorkspaceHistory) => WorkspaceHistory,
): void {
    set((state) => {
        const before = state.workspaces[workspaceId] ?? NO_HISTORY;
        const after = change(before);

        return after === before
            ? state
            : { workspaces: { ...state.workspaces, [workspaceId]: after } };
    });
}

/** Keeps what still exists: a pick or an open send that left the list leaves with it. */
function narrowedTo(history: WorkspaceHistory, summaries: HistorySummary[]): WorkspaceHistory {
    const ids = new Set(summaries.map((summary) => summary.id));

    return {
        ...history,
        openId: history.openId !== null && ids.has(history.openId) ? history.openId : null,
        selected: history.selected.filter((id) => ids.has(id)),
        summaries,
    };
}

/**
 * A push can arrive twice, or after the list that already holds it: its send is added once. What
 * the limits took out of the disk to make room leaves with it, the send itself included.
 */
function withPush(
    history: WorkspaceHistory,
    summary: HistorySummary,
    removed: readonly string[],
): WorkspaceHistory {
    const known = history.summaries.some((each) => each.id === summary.id);
    const listed = known ? history.summaries : [summary, ...history.summaries];
    const kept = listed.filter((each) => !removed.includes(each.id));

    if (known && kept.length === listed.length) {
        return history;
    }

    return narrowedTo(history, kept);
}

function actionsFor(set: HistoryStoreApi['setState']): HistoryActions {
    const actions: HistoryActions = {
        append: (workspaceId, summary, removed) => {
            updated(set, workspaceId, (history) => withPush(history, summary, removed));
        },
        clear: (workspaceId) => {
            updated(set, workspaceId, (history) => narrowedTo(history, []));
        },
        removeIds: (workspaceId, ids) => {
            updated(set, workspaceId, (history) =>
                narrowedTo(
                    history,
                    history.summaries.filter((summary) => !ids.includes(summary.id)),
                ),
            );
        },
        reset: () => {
            set({ ...initialHistorySlice(), ...actions }, true);
        },
        setFilter: (workspaceId, filterItemPath) => {
            updated(set, workspaceId, (history) => ({ ...history, filterItemPath }));
        },
        setOpen: (workspaceId, openId) => {
            updated(set, workspaceId, (history) => ({ ...history, openId }));
        },
        setSummaries: (workspaceId, summaries) => {
            updated(set, workspaceId, (history) => ({
                ...narrowedTo(history, summaries),
                loaded: true,
            }));
        },
        /** A third pick takes the place of the oldest one: choosing is replacing, never refusing. */
        toggleSelected: (workspaceId, id) => {
            updated(set, workspaceId, (history) => ({
                ...history,
                selected: history.selected.includes(id)
                    ? history.selected.filter((each) => each !== id)
                    : [...history.selected, id].slice(-MAX_SELECTED),
            }));
        },
    };

    return actions;
}

export function createHistoryStore(): HistoryStoreApi {
    return createStore<HistoryStore>()((set) => ({
        ...initialHistorySlice(),
        ...actionsFor(set),
    }));
}

export const historyStore = scopeToOrigin(createHistoryStore());
