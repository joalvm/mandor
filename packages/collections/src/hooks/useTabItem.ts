import type { CollectionNode } from '@mandor/schema';
import { useTab } from '@mandor/shell';
import { useStore } from 'zustand';

import { collectionStore } from '../collection-store.js';
import type { ItemLeaf } from '../item-leaf-registry.js';
import { isGroup } from '../lib/group-nodes.js';
import { itemPartsOf } from '../lib/item-resource.js';
import { nodeAt } from '../lib/node-at.js';
import { useItemLeaf } from './useItemLeaf.js';

type TabItem = {
    /** The node of the tree the tab is open on; nothing while the tree does not hold it. */
    item: Extract<CollectionNode, { kind: 'item' }> | undefined;
    /** The declared kind of that item; nothing for a kind this window does not draw. */
    leaf: ItemLeaf | undefined;
    /** The name the node had, for the page that says its kind is unknown. */
    name: string | undefined;
    resource: string;
};

/** The item a tab of the collection is open on, read off the tree, with the kind that draws it. */
export function useTabItem(): TabItem {
    const { resource } = useTab();
    const node = useStore(collectionStore, (state) =>
        nodeAt(state.nodes, itemPartsOf(resource)?.path ?? ''),
    );
    const item = node === null || isGroup(node) ? undefined : node;
    const leaf = useItemLeaf(item?.itemKind);

    return { item, leaf, name: node?.name, resource };
}
