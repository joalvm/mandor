import { collectionStore } from '../collection-store.js';

import { itemPartsOf } from './item-resource.js';
import { itemTrail } from './item-trail.js';

/** The names of what holds the item of a tab, for its tooltip: the tree is read as it is now. */
export function itemTabTrail(resource: string): string[] {
    const parts = itemPartsOf(resource);

    if (parts === null) {
        return [];
    }

    return itemTrail(collectionStore.getState().nodes, parts.path);
}
