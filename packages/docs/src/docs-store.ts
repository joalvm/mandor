import type { ErrorCode, ListedDoc } from '@mandor/ipc';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { DocViewState } from './doc-view-state.js';
import { initialDocsSlice, type DocsSlice } from './docs.slice.js';
import { sideOfText, viewsWith, viewsWithout } from './lib/doc-views.js';

type DocsActions = {
    beginRead: (resource: string) => boolean;
    endRead: (resource: string) => void;
    /** Lets go of the text of a file once its last tab is gone; the next tab reads it again. */
    forgetText: (resource: string) => void;
    /** Lets go of how one tab was showing its doc, once the tab is gone. */
    releaseView: (tabId: string) => void;
    reset: () => void;
    setDeleting: (name: string | null) => void;
    setDocs: (docs: ListedDoc[]) => void;
    /** The workspace changed: the list of the last one is not the list of this one. */
    forgetDocs: () => void;
    setError: (error: ErrorCode | null) => void;
    setRenaming: (name: string | null) => void;
    /** Opens the name field of a doc made a moment ago, the one field Escape can take back. */
    nameJustMade: (name: string) => void;
    /** Writes down which side a tab opened on, from the text it first saw. Once, per tab. */
    settleSide: (tabId: string, text: string) => void;
    setText: (resource: string, text: string) => void;
    /** Changes part of how one tab is showing its doc, leaving the rest of it where it was. */
    setView: (tabId: string, patch: Partial<DocViewState>) => void;
};

type DocsStore = DocsActions & DocsSlice;
export type DocsStoreApi = StoreApi<DocsStore>;

function actionsFor(set: DocsStoreApi['setState'], get: () => DocsStore): DocsActions {
    const actions: DocsActions = {
        /**
         * Claims the one read of a resource, and answers whether the caller got it. Two tabs on
         * one file mount together; the second is told no, because what it is waiting for is
         * already on its way for the first.
         */
        beginRead: (resource) => {
            const state = get();

            if (state.texts[resource] !== undefined || state.reading.includes(resource)) {
                return false;
            }

            set({ reading: [...state.reading, resource] });

            return true;
        },
        /** Lets go of the claim whether the read landed or failed, so a retry is possible. */
        endRead: (resource) => {
            set((state) => ({ reading: state.reading.filter((each) => each !== resource) }));
        },
        forgetText: (resource) => {
            set((state) => ({
                texts: Object.fromEntries(
                    Object.entries(state.texts).filter(([each]) => each !== resource),
                ),
            }));
        },
        releaseView: (tabId) => {
            set((state) => ({ views: viewsWithout(state.views, tabId) }));
        },
        reset: () => {
            set({ ...initialDocsSlice(), ...actions }, true);
        },
        setDeleting: (name) => {
            set({ deleting: name });
        },
        setDocs: (docs) => {
            set({ docs: [...docs], listed: true });
        },
        forgetDocs: () => {
            set({ docs: [], listed: false });
        },
        setError: (error) => {
            set({ error });
        },
        setRenaming: (name) => {
            set({ justMade: false, renaming: name });
        },
        nameJustMade: (name) => {
            set({ justMade: true, renaming: name });
        },
        setText: (resource, text) => {
            set((state) => ({ texts: { ...state.texts, [resource]: text } }));
        },
        /**
         * The side is read off the text the first time the tab sees it and never again. A doc
         * that arrived empty is one being written in, and the first letter typed into it must
         * not turn the tab into the page under the hands of whoever typed it.
         */
        settleSide: (tabId, text) => {
            if ((get().views[tabId]?.mode ?? null) !== null) {
                return;
            }

            set((state) => ({ views: viewsWith(state.views, tabId, { mode: sideOfText(text) }) }));
        },
        setView: (tabId, patch) => {
            set((state) => ({ views: viewsWith(state.views, tabId, patch) }));
        },
    };

    return actions;
}

function createDocsStore(): DocsStoreApi {
    return createStore<DocsStore>()((set, get) => {
        const actions = actionsFor(set, get);

        return { ...initialDocsSlice(), ...actions };
    });
}

export const docsStore = scopeToOrigin(createDocsStore());
