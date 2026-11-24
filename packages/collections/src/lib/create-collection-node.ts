import { freeName } from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';
import { loadCollection } from './load-collection.js';
import { openItem } from './open-item.js';
import { siblingNames } from './sibling-names.js';

type NewCollectionNode = {
    /** The folder it hangs from. Empty is the top level, which makes a collection. */
    parent: string;
    /** The kind of the leaf being made. Nothing at all makes a folder. */
    itemKind: string | null;
    /** The word that says what it is, in the language of the window: «New request». */
    name: string;
};

/**
 * Makes a collection, a folder or an item at once, under the word that says what it is. A
 * collection or a folder leaves its row naming it; an item opens its tab and the work goes on
 * there, its name changed later from the row. A name nobody typed keeps the word it was born
 * with. Main draws the id the node is filed under, so nothing here spells a path.
 */
export async function createCollectionNode(
    workspaceId: string,
    { itemKind, name, parent }: NewCollectionNode,
): Promise<void> {
    const store = collectionStore.getState();
    const result = await bridge.collections.create({
        workspaceId,
        parent,
        name: freeName(name, siblingNames(store.nodes, parent)),
        ...(itemKind === null ? {} : { itemKind }),
    });

    if (!result.ok) {
        store.setError(result.error.code);

        return;
    }

    await loadCollection(workspaceId);

    if (itemKind === null) {
        collectionStore.getState().nameJustMade(result.value);

        return;
    }

    openItem(workspaceId, result.value, { itemKind });
}
