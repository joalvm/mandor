import { type CollectionNode, collectionPlace } from '@mandor/schema';
import type { ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { siblingsIn } from './collection-spot.js';
import { isGroup } from './group-nodes.js';

/**
 * What a row is for the hitbox, which reads the shape of the tree to know what the pointer can
 * mean over it: an open folder has a first child right under it and cannot take a drop below,
 * and the last of a group is where a drop can climb out to any level above.
 */
export function collectionItemMode(
    nodes: readonly CollectionNode[],
    node: CollectionNode,
    folded: boolean,
): ItemMode {
    if (isGroup(node) && !folded && node.children.length > 0) {
        return 'expanded';
    }

    const siblings = siblingsIn(nodes, collectionPlace(node.path).parent);

    return siblings.at(-1)?.path === node.path ? 'last-in-group' : 'standard';
}
