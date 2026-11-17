import { collectionStore, loadCollection, siblingNames } from '@mandor/collections';
import type { Result } from '@mandor/ipc';
import { freeName } from '@mandor/schema';
import { bridge } from '@mandor/shell';

/**
 * Makes a collection or a folder for a request to go into, under the word that says what it is,
 * numbered when a sibling already wears it. Empty `parent` is the top level, which makes a
 * collection. Answers the path it took, once the tree of the window holds it.
 */
export async function makePlace(
    workspaceId: string,
    parent: string,
    word: string,
): Promise<Result<string>> {
    const name = freeName(word, siblingNames(collectionStore.getState().nodes, parent));
    const made = await bridge.collections.create({ name, parent, workspaceId });

    if (made.ok) {
        await loadCollection(workspaceId);
    }

    return made;
}
