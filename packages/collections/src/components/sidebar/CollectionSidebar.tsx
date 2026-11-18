import { useShellStore } from '@mandor/shell';
import { useStore } from 'zustand';

import { collectionStore } from '../../collection-store.js';
import { CollectionTree } from './CollectionTree.js';

/**
 * The collection of the open workspace, as the last answer from disk said it. It reads nothing:
 * folding the section unmounts this body, so the read lives with the window in
 * `WorkspaceCollection`, and every write reads the tree again there. An empty collection draws
 * nothing: the header holds the ways to fill it.
 */
export function CollectionSidebar() {
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const nodes = useStore(collectionStore, (state) => state.nodes);

    if (workspaceId === null || nodes.length === 0) {
        return null;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col" data-part="collections">
            <CollectionTree workspaceId={workspaceId} />
        </div>
    );
}
