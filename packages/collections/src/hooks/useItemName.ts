import { useStore } from 'zustand';

import { collectionStore } from '../collection-store.js';
import { nameOnTree } from '../lib/item-name.js';

/** The name an item goes by now, following every rename; none while the tree does not hold it. */
export function useItemName(resource: string): string | null {
    return useStore(collectionStore, (state) => nameOnTree(state.nodes, resource));
}
