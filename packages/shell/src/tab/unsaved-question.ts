import { createStore, type StoreApi } from 'zustand/vanilla';

import { scopeToOrigin } from '../origin/origin-scope.js';
import type { Tab } from './tab.js';

type UnsavedQuestion = {
    /** The tab whose closing waits for a word, with the way to give it; nothing while no one asks. */
    asking: { leave: (leave: boolean) => void; tab: Tab } | null;
    /** Settles the question: true lets the tab go —saved or let go of— and false keeps it. */
    answer: (leave: boolean) => void;
    /** Resolves once the person says whether a tab with unsaved work may go. */
    ask: (tab: Tab) => Promise<boolean>;
};

export type UnsavedQuestionApi = StoreApi<UnsavedQuestion>;

/**
 * The one question the window asks before a tab with unsaved work leaves: save it, let it go, or
 * keep the tab. One at a time —closing many asks about each in turn— so the window holds one
 * question, never a queue: the next is asked once this one is answered.
 */
export const unsavedQuestion: UnsavedQuestionApi = scopeToOrigin(
    createStore<UnsavedQuestion>()((set, get) => ({
        answer: (leave) => {
            const asking = get().asking;

            set({ asking: null });
            asking?.leave(leave);
        },
        ask: (tab) =>
            new Promise<boolean>((resolve) => {
                set({ asking: { leave: resolve, tab } });
            }),
        asking: null,
    })),
);
