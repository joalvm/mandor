import type { CollectionNode } from '@mandor/schema';
import { fireAndForget, originName } from '@mandor/shell';

import { itemLeaf } from '../item-leaf-registry.js';
import { exampleResource } from './example-resource.js';
import { exampleRowParts } from './example-row-id.js';
import { isGroup } from './group-nodes.js';
import { nodeAt } from './node-at.js';

/**
 * Duplicates the example that is the one thing taken in the tree, and answers whether there was
 * one to duplicate. Taken together with others, or not an example, it acts on nothing: the key
 * means «duplicate this example» and no more.
 */
export function duplicateExampleRow(
    workspaceId: string,
    nodes: readonly CollectionNode[],
    selected: readonly string[],
): boolean {
    const [only, ...others] = selected;
    const parts = only === undefined || others.length > 0 ? null : exampleRowParts(only);
    const item = parts === null ? null : nodeAt(nodes, parts.itemPath);

    if (parts === null || item === null || isGroup(item)) {
        return false;
    }

    const examples = itemLeaf(item.itemKind)?.examples;

    if (examples === undefined) {
        return false;
    }

    fireAndForget(
        examples.duplicate(exampleResource(originName(), workspaceId, item.path, parts.key)),
    );

    return true;
}
