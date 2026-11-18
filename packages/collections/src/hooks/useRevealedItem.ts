import { useShellStore } from '@mandor/shell';
import { useEffect } from 'react';

import { collectionStore } from '../collection-store.js';
import { itemPartsOf } from '../lib/item-resource.js';

/** The folders an item sits in, outermost first: `a/b/c.yaml` sits in `a` and in `a/b`. */
function foldersOf(path: string): string[] {
    const segments = path.split('/');

    return segments.slice(1).map((_, index) => segments.slice(0, index + 1).join('/'));
}

/**
 * The item a tab asked the lateral to show, when it is one of this workspace: its folders open
 * and it is the one taken, so the tree can go to it once its line is drawn.
 */
export function useRevealedItem(workspaceId: string): string | null {
    const revealing = useShellStore((state) => state.revealing);
    const parts = revealing === null ? null : itemPartsOf(revealing);
    const path = parts?.workspaceId === workspaceId ? parts.path : null;

    useEffect(() => {
        if (path === null) {
            return;
        }

        for (const folder of foldersOf(path)) {
            collectionStore.getState().fold(workspaceId, folder, false);
        }

        collectionStore.getState().setSelected([path]);
    }, [path, workspaceId]);

    return path;
}
