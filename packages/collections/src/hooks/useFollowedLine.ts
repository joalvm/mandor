import { useFollowedResource } from '@mandor/shell';
import { useEffect } from 'react';

import { collectionLineOf } from '../lib/collection-line-of.js';
import { showCollectionLine } from '../lib/show-collection-line.js';

/**
 * The line the tree follows, when the tree of this workspace lists it: the item, folder or
 * example of the tab in front, or the message a connection in front composes. Each time it
 * changes, its folders open and it is the one taken, as an explorer follows the editor in front.
 * The tree scrolls to it and leaves the focus alone; what the user takes afterwards stays taken
 * until something else comes to the front.
 */
export function useFollowedLine(workspaceId: string): string | null {
    const resource = useFollowedResource();

    useEffect(() => {
        const spot = resource === null ? null : collectionLineOf(resource, workspaceId);

        if (spot !== null) {
            showCollectionLine(workspaceId, spot);
        }
    }, [resource, workspaceId]);

    return resource === null ? null : (collectionLineOf(resource, workspaceId)?.line ?? null);
}
