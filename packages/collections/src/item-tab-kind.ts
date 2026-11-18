import type { ErrorCode } from '@mandor/ipc';

import { collectionStore } from './collection-store.js';
import { itemLeaf } from './item-leaf-registry.js';
import { itemKindOf } from './lib/item-kind-of.js';

/** What a tab showing one item of the collection calls itself, in the session and in the register. */
export const ITEM_TAB_KIND = 'item';

/** The tab lets go of what the kind of its item held for it. */
export function releaseItem(_tabId: string, resource: string): void {
    itemLeaf(itemKindOf(resource))?.release?.(resource);
}

/** Whether the kind of the item holds work of the tab that is not on disk yet. */
export function isItemDirty(_tabId: string, resource: string): boolean {
    return itemLeaf(itemKindOf(resource))?.dirty?.(resource) === true;
}

/** A kind that is dirty without saying how to save has nothing to save, which is no refusal. */
export function saveItem(_tabId: string, resource: string): Promise<ErrorCode | null> {
    return itemLeaf(itemKindOf(resource))?.save?.(resource) ?? Promise.resolve(null);
}

/** The titles of the item tabs follow the collection: a rename shows on the tab at once. */
export function subscribeItemTitles(onChange: () => void): () => void {
    return collectionStore.subscribe(onChange);
}
