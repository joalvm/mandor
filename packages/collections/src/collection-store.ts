import type { ErrorCode } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { scopeToOrigin } from '@mandor/shell';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { initialCollectionSlice, type CollectionSlice } from './collection.slice.js';
import { exampleItemPaths, groupPaths } from './lib/group-nodes.js';
import { childrenAt } from './lib/node-at.js';
import { holdsRow } from './lib/holds-row.js';

type CollectionActions = {
    fold: (workspaceId: string, path: string, folded: boolean) => void;
    foldAll: (workspaceId: string) => void;
    foldInside: (workspaceId: string, path: string) => void;
    /** Opens the name field of a row made a moment ago, the one field Escape can take back. */
    nameJustMade: (path: string) => void;
    openExamples: (workspaceId: string, path: string, open: boolean) => void;
    reset: () => void;
    setDeleting: (paths: readonly string[] | null) => void;
    setError: (error: ErrorCode | null) => void;
    setNodes: (nodes: CollectionNode[]) => void;
    setRenaming: (path: string | null) => void;
    setSelected: (paths: readonly string[]) => void;
};

type CollectionStore = CollectionActions & CollectionSlice;
export type CollectionStoreApi = StoreApi<CollectionStore>;

/** The list with the path in it when `listed`, and without it when not; once at most. */
function listedWith(list: readonly string[], path: string, listed: boolean): string[] {
    if (!listed) {
        return list.filter((each) => each !== path);
    }

    return list.includes(path) ? [...list] : [...list, path];
}

/** The list with every one of the paths in it, each once, in the order they first came. */
function unionOf(list: readonly string[], paths: readonly string[]): string[] {
    return [...new Set([...list, ...paths])];
}

/**
 * The folds of a workspace once `folded` is what is closed above and everything under `nodes` is
 * closed too: every group at every depth and the examples of every item. Closing a line closes
 * what it holds, so opening it again shows its first level and nothing deeper.
 */
function closedUnder(
    state: CollectionSlice,
    workspaceId: string,
    nodes: readonly CollectionNode[],
    folded: readonly string[],
): Pick<CollectionSlice, 'examplesClosed' | 'folded'> {
    const closed = state.examplesClosed[workspaceId] ?? [];

    return {
        examplesClosed: {
            ...state.examplesClosed,
            [workspaceId]: unionOf(closed, exampleItemPaths(nodes)),
        },
        folded: { ...state.folded, [workspaceId]: unionOf(folded, groupPaths(nodes)) },
    };
}

function actionsFor(set: CollectionStoreApi['setState']): CollectionActions {
    const actions: CollectionActions = {
        /**
         * Opens or closes one folder of one workspace; closing it closes everything it holds.
         * Switching workspace and coming back finds the tree as it was left, which is why this
         * is not state of a component.
         */
        fold: (workspaceId, path, isFolded) => {
            set((state) =>
                closedUnder(
                    state,
                    workspaceId,
                    isFolded ? childrenAt(state.nodes, path) : [],
                    listedWith(state.folded[workspaceId] ?? [], path, isFolded),
                ),
            );
        },
        /** Closes every line of the tree at once, the deep ones as well. */
        foldAll: (workspaceId) => {
            set((state) =>
                closedUnder(state, workspaceId, state.nodes, state.folded[workspaceId] ?? []),
            );
        },
        /** Closes everything inside one group and leaves the group itself open on its first level. */
        foldInside: (workspaceId, path) => {
            set((state) =>
                closedUnder(
                    state,
                    workspaceId,
                    childrenAt(state.nodes, path),
                    listedWith(state.folded[workspaceId] ?? [], path, false),
                ),
            );
        },
        /** Shows or hides the examples of one item, as `fold` does for the children of a folder. */
        openExamples: (workspaceId, path, isOpen) => {
            set((state) => ({
                examplesClosed: {
                    ...state.examplesClosed,
                    [workspaceId]: listedWith(
                        state.examplesClosed[workspaceId] ?? [],
                        path,
                        !isOpen,
                    ),
                },
            }));
        },
        reset: () => {
            set({ ...initialCollectionSlice(), ...actions }, true);
        },
        setDeleting: (paths) => {
            set({ deleting: paths === null ? null : [...paths] });
        },
        setError: (error) => {
            set({ error });
        },
        /**
         * A new read of the tree lets go of whatever it no longer holds. A path deleted or moved
         * away, or an example dropped from its item, stays out of the selection, so no key
         * pressed afterwards acts on a ghost.
         */
        setNodes: (nodes) => {
            set((state) => ({
                nodes: [...nodes],
                selected: state.selected.filter((path) => holdsRow(nodes, path)),
            }));
        },
        nameJustMade: (path) => {
            set({ justMade: true, renaming: path });
        },
        setRenaming: (renaming) => {
            set({ justMade: false, renaming });
        },
        setSelected: (paths) => {
            set({ selected: [...paths] });
        },
    };

    return actions;
}

function createCollectionStore(): CollectionStoreApi {
    return createStore<CollectionStore>()((set) => {
        const actions = actionsFor(set);

        return { ...initialCollectionSlice(), ...actions };
    });
}

export const collectionStore = scopeToOrigin(createCollectionStore());
