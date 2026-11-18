import type { CollectionNode } from '@mandor/schema';

import { isGroup } from './group-nodes.js';
import { nodeAt } from './node-at.js';

/**
 * The names of what an item hangs from, outermost first: its collection, then its folders. The
 * workspace is not one of them — the title bar already names it. Whatever holds the item and the
 * tree has not brought yet is left out: a tab opened before its tree landed shows the shorter
 * trail, and the full one once the tree arrives.
 */
export function itemTrail(nodes: readonly CollectionNode[], path: string): string[] {
    const segments = path.split('/').slice(0, -1);
    const names: string[] = [];

    for (const [index] of segments.entries()) {
        const holder = nodeAt(nodes, segments.slice(0, index + 1).join('/'));

        if (holder === null || !isGroup(holder)) {
            break;
        }

        names.push(holder.name);
    }

    return names;
}
