import { collectionStore } from '../collection-store.js';
import { isGroup } from './group-nodes.js';
import { itemPartsOf } from './item-resource.js';
import { nodeAt } from './node-at.js';

/** The kind of the item a resource names, as the tree says it now; nothing for one that left it. */
export function itemKindOf(resource: string): string | undefined {
    const parts = itemPartsOf(resource);
    const node = nodeAt(collectionStore.getState().nodes, parts?.path ?? '');

    if (node === null || isGroup(node)) {
        return undefined;
    }

    return node.itemKind;
}
