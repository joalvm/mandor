import { useMessages } from '@mandor/i18n';
import type { ResourceUri } from '@mandor/schema';
import { revealInSidebar, shellStore } from '@mandor/shell';
import { IconButton } from '@mandor/ui';
import { useStore } from 'zustand';

import { collectionStore } from '../../collection-store.js';
import { itemPartsOf } from '../../lib/item-resource.js';
import { nodeAt } from '../../lib/node-at.js';
import { COLLECTIONS_SECTION_ID } from '../sidebar/CollectionsSection.js';
import { CollectionNodeMenu } from '../sidebar/CollectionNodeMenu.js';

type ItemActionsMenuProps = { resource: ResourceUri };

/**
 * «More actions» on the bar of the tab of an item: the menu of its row in the tree, reached
 * without going to the tree. A tab open on nothing the tree holds, a request not saved anywhere,
 * has no row and so no menu.
 */
export function ItemActionsMenu({ resource }: ItemActionsMenuProps) {
    const messages = useMessages('collections');
    const parts = itemPartsOf(resource);
    const node = useStore(collectionStore, (state) => nodeAt(state.nodes, parts?.path ?? ''));

    if (parts === null || node === null) {
        return null;
    }

    return (
        <CollectionNodeMenu
            node={node}
            onReachRow={() => {
                revealInSidebar(shellStore.getState(), COLLECTIONS_SECTION_ID, resource);
            }}
            workspaceId={parts.workspaceId}
        >
            <IconButton icon="more-horizontal" label={messages('itemActions')} size="sm" />
        </CollectionNodeMenu>
    );
}
