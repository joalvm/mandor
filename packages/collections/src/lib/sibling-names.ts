import type { CollectionNode } from '@mandor/schema';

import { isGroup } from './group-nodes.js';
import { nodeAt } from './node-at.js';

/**
 * The names already worn under a folder, the ones a new node there must not repeat. Empty is the
 * top level, where the collections stand.
 */
export function siblingNames(nodes: readonly CollectionNode[], parent: string): string[] {
    if (parent === '') {
        return nodes.map((node) => node.name);
    }

    const holder = nodeAt(nodes, parent);

    return holder !== null && isGroup(holder) ? holder.children.map((node) => node.name) : [];
}
