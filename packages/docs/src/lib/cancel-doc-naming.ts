import { leavesOf } from '@mandor/ipc';
import { originName, shellStore } from '@mandor/shell';

import { docsStore } from '../docs-store.js';

import { deleteDoc } from './delete-doc.js';
import { docResource } from './doc-resource.js';

/**
 * Escape on the name field of a doc. The field of a doc made a moment ago, with nothing written
 * in it, takes the making back: the doc goes, and so does the tab it opened, as if it had never
 * been asked for. Any other field only closes, and the doc keeps the title it had.
 */
export async function cancelDocNaming(workspaceId: string, name: string): Promise<void> {
    const store = docsStore.getState();
    const resource = docResource(originName(), workspaceId, name);
    const untouched = store.justMade && (store.texts[resource] ?? '') === '';

    store.setRenaming(null);

    if (!untouched) {
        return;
    }

    const shell = shellStore.getState();
    const tabs = leavesOf(shell.grid).flatMap((leaf) =>
        leaf.tabs
            .filter((tab) => tab.resource === resource)
            .map((tab) => ({ group: leaf.id, tab: tab.id })),
    );

    for (const { group, tab } of tabs) {
        shellStore.getState().closeTab(group, tab);
    }

    await deleteDoc(workspaceId, name);
}
