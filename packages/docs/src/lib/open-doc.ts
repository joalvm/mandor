import { originName, shellStore } from '@mandor/shell';

import { docResource } from './doc-resource.js';
import { docTabIn } from './doc-tab-in.js';
import { nextDocTabId } from './doc-tab-id.js';
import { showDocTab } from './show-doc-tab.js';

/**
 * How a doc is asked for. `aside` puts it in the group beside; `preview` only looks at it, in the
 * tab the group keeps for a look, which the next look replaces. A doc asked for aside is kept.
 */
type OpenDocOptions = { aside?: boolean; preview?: boolean };

/**
 * Shows a doc in the centre. A file is one tab: asked for again it is the tab it already has
 * that comes forward, wherever in the window that tab is sitting, because the second tab on one
 * file is the same text twice with two scroll positions, and closing the wrong one is a thing
 * the reader then has to notice. Reading a doc beside what it describes is the split, not a
 * second copy of the doc. Asking to keep a doc that is only being looked at keeps its tab.
 */
export function openDoc(
    workspaceId: string,
    name: string,
    { aside = false, preview = false }: OpenDocOptions = {},
): void {
    const shell = shellStore.getState();
    const resource = docResource(originName(), workspaceId, name);
    const open = docTabIn(shell.grid, resource, 'doc');

    if (open !== null) {
        showDocTab(open);

        if (!preview) {
            shell.keepTab(open.tabId);
        }

        return;
    }

    const tab = { id: nextDocTabId(shell.grid), kind: 'doc', resource };

    if (aside) {
        shell.openTabAside(tab);

        return;
    }

    shell.openTab(shell.activeGroupId, tab, { preview });
}
