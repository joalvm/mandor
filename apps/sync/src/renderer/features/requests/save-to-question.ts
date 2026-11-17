import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

/** The request being given a place, and how the one who asked hears where it went. */
export type SaveToAsking = {
    /** The tab that asked goes on as the item it became; false when the tab is leaving anyway. */
    reopen: boolean;
    resource: string;
    settle: (saved: boolean) => void;
};

type SaveToQuestion = {
    /** Settles the question: true once the request is in the collection, false to keep it loose. */
    answer: (saved: boolean) => void;
    /** Resolves once the person put the request somewhere, or chose to keep it where it was. */
    ask: (resource: string, reopen: boolean) => Promise<boolean>;
    asking: SaveToAsking | null;
};

/**
 * The question a request saved nowhere asks the first time it is saved: under what name, and
 * in which collection or folder. One at a time: a second ask settles the first as kept.
 */
export const saveToQuestion: StoreApi<SaveToQuestion> = scopeToOrigin(
    createStore<SaveToQuestion>()((set, get) => ({
        answer: (saved) => {
            const asking = get().asking;

            set({ asking: null });
            asking?.settle(saved);
        },
        ask: (resource, reopen) =>
            new Promise<boolean>((settle) => {
                get().asking?.settle(false);
                set({ asking: { reopen, resource, settle } });
            }),
        asking: null,
    })),
);
