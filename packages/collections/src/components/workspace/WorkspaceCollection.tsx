import { fireAndForget, useFailureToast, useRepoChanged, useShellStore } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';
import { useStore } from 'zustand';

import { collectionStore } from '../../collection-store.js';
import { loadCollection } from '../../lib/load-collection.js';

/**
 * The collection of the open workspace, read once per workspace for as long as the window lives,
 * and the voice of what went wrong writing to it. It draws nothing.
 *
 * The read does not belong to the section: a folded section unmounts its body, and a body that
 * read on mount emptied the tree on each unfold — the rows and every breadcrumb reading the tree
 * blinked until the answer came back. A fault raised while the section is folded is said too.
 *
 * A file of the collection that changed on disk without the window is read again, folded or not.
 */
export function WorkspaceCollection(): null {
    const notifyFailure = useEffectEvent(useFailureToast());
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const error = useStore(collectionStore, (state) => state.error);

    useEffect(() => {
        collectionStore.getState().setNodes([]);

        if (workspaceId !== null) {
            fireAndForget(loadCollection(workspaceId));
        }
    }, [workspaceId]);

    useRepoChanged(
        (entity) => entity.area === 'collections' && entity.workspaceId === workspaceId,
        () => {
            if (workspaceId !== null) {
                fireAndForget(loadCollection(workspaceId));
            }
        },
    );

    useEffect(() => {
        if (error === null) {
            return;
        }

        notifyFailure(error);
        collectionStore.getState().setError(null);
    }, [error]);

    return null;
}
