import { openItem } from '@mandor/collections';
import { leavesOf } from '@mandor/ipc';
import { REQUEST_ITEM_KIND } from '@mandor/schema';
import { shellStore } from '@mandor/shell';

import { loosePartsOf, looseTabId } from './loose-resource.js';

/**
 * A request saved nowhere that was just put in the collection goes on as the item it became: its
 * tab opens, and the tab that held it while it was loose leaves without asking — what it held is
 * on disk now.
 */
export function looseBecomesItem(resource: string, path: string): void {
    const parts = loosePartsOf(resource);

    if (parts === null) {
        return;
    }

    openItem(parts.workspaceId, path, { itemKind: REQUEST_ITEM_KIND });

    const shell = shellStore.getState();
    const tabId = looseTabId(parts.id);
    const group = leavesOf(shell.grid).find((leaf) => leaf.tabs.some((tab) => tab.id === tabId));

    if (group !== undefined) {
        shell.closeTab(group.id, tabId);
    }
}
