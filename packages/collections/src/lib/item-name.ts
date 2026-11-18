import type { CollectionNode } from '@mandor/schema';

import { collectionStore } from '../collection-store.js';

import { itemPartsOf } from './item-resource.js';
import { nodeAt } from './node-at.js';

/**
 * The name an item goes by now, or none when the tree does not hold it. The tree hears every
 * rename; what a tab read off the file before one does not, and writing that would undo it.
 */
export function nameOnTree(nodes: readonly CollectionNode[], resource: string): string | null {
    const parts = itemPartsOf(resource);

    return parts === null ? null : (nodeAt(nodes, parts.path)?.name ?? null);
}

/** The name to write or to say for an item, off the tree as it is at this moment. */
export function itemNameOf(resource: string, fallback: string): string {
    return nameOnTree(collectionStore.getState().nodes, resource) ?? fallback;
}
