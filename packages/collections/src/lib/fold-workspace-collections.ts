import { shellStore } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';

/** Closes every line of the tree of the open workspace; with none open there is nothing to close. */
export function foldWorkspaceCollections(): void {
    const workspaceId = shellStore.getState().activeWorkspaceId;

    if (workspaceId === null) {
        return;
    }

    collectionStore.getState().foldAll(workspaceId);
}
