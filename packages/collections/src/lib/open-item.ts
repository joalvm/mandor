import { originName, shellStore, shownTabId } from '@mandor/shell';

import { itemLeaf } from '../item-leaf-registry.js';
import { ITEM_TAB_KIND } from '../item-tab-kind.js';
import { itemResource } from './item-resource.js';

type OpenItemOptions = { itemKind?: string | undefined; preview?: boolean };

/**
 * Shows an item in the centre. One tab per item, unlike a doc: an item is worked on, not read
 * beside something else, and a second view of the same file would be two drafts of one thing.
 * A kind that claimed the item first — a connection composing its event — takes it whole, and
 * no tab of its own opens.
 *
 * `preview` only looks at the item, in the tab the group keeps for a look; without it the tab is
 * kept, also when it was only being looked at.
 */
export function openItem(
    workspaceId: string,
    path: string,
    { itemKind, preview = false }: OpenItemOptions = {},
): void {
    const resource = itemResource(originName(), workspaceId, path);

    if (itemKind !== undefined && itemLeaf(itemKind)?.open?.(resource) === true) {
        return;
    }

    const shell = shellStore.getState();

    shell.openTab(
        shell.activeGroupId,
        {
            id: shownTabId(ITEM_TAB_KIND, resource, `${ITEM_TAB_KIND}-${workspaceId}-${path}`),
            kind: ITEM_TAB_KIND,
            resource,
        },
        { preview },
    );
}
