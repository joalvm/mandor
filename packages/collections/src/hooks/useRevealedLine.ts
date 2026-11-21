import { useShellStore } from '@mandor/shell';
import { useEffect } from 'react';

import { collectionLineOf } from '../lib/collection-line-of.js';
import { showCollectionLine } from '../lib/show-collection-line.js';

/**
 * The line a tab asked the lateral to show, when it is one of this workspace — an item, a folder
 * or an example: what hides it opens and it is the one taken, so the tree can go to it once its
 * line is drawn.
 */
export function useRevealedLine(workspaceId: string): string | null {
    const revealing = useShellStore((state) => state.revealing);

    useEffect(() => {
        const spot = revealing === null ? null : collectionLineOf(revealing, workspaceId);

        if (spot !== null) {
            showCollectionLine(workspaceId, spot);
        }
    }, [revealing, workspaceId]);

    return revealing === null ? null : (collectionLineOf(revealing, workspaceId)?.line ?? null);
}
