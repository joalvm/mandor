import { collectionStore } from '../collection-store.js';

import { itemPartsOf } from './item-resource.js';
import { nodeAt } from './node-at.js';

/**
 * What the strip calls a tab on an item: the name in the file, and nothing while the tree of that
 * workspace has not landed yet. A session restored into a cold store draws the word the window
 * keeps for a thing without a name and retitles itself the moment the collection arrives; the
 * last segment of the path is an id, and no id is ever drawn.
 */
export function itemTitle(resource: string): string {
    const parts = itemPartsOf(resource);

    if (parts === null) {
        return '';
    }

    return nodeAt(collectionStore.getState().nodes, parts.path)?.name ?? '';
}
