import type { CollectionItemExample, CollectionItemNode } from '@mandor/schema';
import { originName } from '@mandor/shell';

import { itemLeaf } from '../item-leaf-registry.js';
import { exampleResource } from './example-resource.js';

/**
 * Asks the app that declared the kind of the item to open one of its examples. The tree knows
 * no tab of an example: what opens, and where, is the app's, so with nobody declared nothing does.
 */
export function openExampleRow(
    workspaceId: string,
    node: CollectionItemNode,
    example: CollectionItemExample,
    options: { beside: boolean; preview: boolean },
): void {
    itemLeaf(node.itemKind)?.examples?.open(
        exampleResource(originName(), workspaceId, node.path, example.key),
        options,
    );
}
