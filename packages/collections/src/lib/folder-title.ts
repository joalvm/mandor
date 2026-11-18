import { collectionStore } from '../collection-store.js';
import { folderPartsOf } from './folder-resource.js';
import { nodeAt } from './node-at.js';

/** What the tab of a folder is called: the name of its node in the tree, never its path. */
export function folderTitle(resource: string): string {
    const parts = folderPartsOf(resource);

    if (parts === null) {
        return '';
    }

    return nodeAt(collectionStore.getState().nodes, parts.path)?.name ?? '';
}
