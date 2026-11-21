import { selectActiveTabId, selectResourceOfTab, useShellStore } from '@mandor/shell';
import { useEffect } from 'react';

import { collectionLineOf } from '../lib/collection-line-of.js';
import { showCollectionLine } from '../lib/show-collection-line.js';

/**
 * The line of the tab in front, when the tree of this workspace lists it: each time another tab
 * comes to the front, its folders open and it is the one taken, as an explorer follows the editor
 * in front. The tree scrolls to it and leaves the focus alone; what the user takes afterwards
 * stays taken until another tab comes to the front.
 */
export function useFollowedLine(workspaceId: string): string | null {
    const resource = useShellStore((state) => {
        const tabId = selectActiveTabId(state);

        return tabId === null ? null : selectResourceOfTab(state, tabId);
    });

    useEffect(() => {
        const spot = resource === null ? null : collectionLineOf(resource, workspaceId);

        if (spot !== null) {
            showCollectionLine(workspaceId, spot);
        }
    }, [resource, workspaceId]);

    return resource === null ? null : (collectionLineOf(resource, workspaceId)?.line ?? null);
}
