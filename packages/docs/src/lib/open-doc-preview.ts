import type { ResourceUri } from '@mandor/schema';
import { shellStore } from '@mandor/shell';

import { docTabIn } from './doc-tab-in.js';
import { nextDocTabId } from './doc-tab-id.js';
import { showDocTab } from './show-doc-tab.js';

/**
 * A second view of a file already open: the same resource read instead of written. It lands in
 * the group that asked for it, and moving it next to its editor is the shell's `Mover al lado`,
 * which already knows how to do that for any tab. Asked for twice it is the page already open
 * that comes forward, the way the document itself is one tab.
 */
export function openDocPreview(resource: ResourceUri): void {
    const shell = shellStore.getState();
    const open = docTabIn(shell.grid, resource, 'doc-preview');

    if (open !== null) {
        showDocTab(open);

        return;
    }

    shell.openTab(shell.activeGroupId, {
        id: nextDocTabId(shell.grid, 'doc-preview'),
        kind: 'doc-preview',
        resource,
    });
}
