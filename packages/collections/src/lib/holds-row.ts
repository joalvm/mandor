import type { CollectionNode } from '@mandor/schema';

import { exampleRowParts } from './example-row-id.js';
import { isGroup } from './group-nodes.js';
import { nodeAt } from './node-at.js';

/**
 * Whether a line of the tree is still there: a node by its path, an example by its item having
 * it listed. What was taken or being renamed on a line that is gone must not outlive it.
 */
export function holdsRow(nodes: readonly CollectionNode[], id: string): boolean {
    if (nodeAt(nodes, id) !== null) {
        return true;
    }

    const example = exampleRowParts(id);

    if (example === null) {
        return false;
    }

    const item = nodeAt(nodes, example.itemPath);

    return (
        item !== null &&
        !isGroup(item) &&
        (item.examples ?? []).some((each) => each.key === example.key)
    );
}
