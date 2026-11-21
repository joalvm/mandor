import { collectionStore } from '../collection-store.js';
import type { CollectionLineSpot } from './collection-line-of.js';

/**
 * Opens what hides a line of the tree — its folders and, for an example, the examples of its item
 * — and takes it alone, so the tree can go to it once it is drawn.
 */
export function showCollectionLine(workspaceId: string, spot: CollectionLineSpot): void {
    const store = collectionStore.getState();

    for (const folder of spot.folders) {
        store.fold(workspaceId, folder, false);
    }

    if (spot.examplesOf !== null) {
        store.openExamples(workspaceId, spot.examplesOf, true);
    }

    store.setSelected([spot.line]);
}
