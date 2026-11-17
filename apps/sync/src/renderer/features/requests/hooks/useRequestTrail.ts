import { collectionStore, itemPartsOf, itemTrail } from '@mandor/collections';
import { useStore } from 'zustand';

/**
 * Where a request stands: its collection and the folders that hold it. The workspace is not
 * part of it — the title bar already names it. What the trail cannot name yet, a tree still on
 * its way, is left out and filled in when it lands.
 */
export function useRequestTrail(resource: string): string[] {
    const nodes = useStore(collectionStore, (state) => state.nodes);
    const parts = itemPartsOf(resource);

    if (parts === null) {
        return [];
    }

    return itemTrail(nodes, parts.path);
}
