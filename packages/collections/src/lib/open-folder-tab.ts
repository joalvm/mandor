import { originName, shellStore, shownTabId } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';
import { FOLDER_TAB_KIND } from '../folder-section-declarations.js';
import { folderResource } from './folder-resource.js';

/** The id of the tab of a folder: one per group of the tree, whatever group it was opened in. */
export function folderTabId(workspaceId: string, path: string): string {
    return `${FOLDER_TAB_KIND}-${workspaceId}-${path}`;
}

/**
 * Opens the tab of a collection or a folder, or brings it forward when it is open. A section
 * asked for becomes the one in sight; without one the tab keeps the one it had.
 */
export function openFolderTab(workspaceId: string, path: string, section?: string): void {
    const shell = shellStore.getState();
    const resource = folderResource(originName(), workspaceId, path);
    const id = shownTabId(FOLDER_TAB_KIND, resource, folderTabId(workspaceId, path));

    if (section !== undefined) {
        collectionStore.setState((state) => ({
            folderSections: { ...state.folderSections, [id]: section },
        }));
    }

    shell.openTab(shell.activeGroupId, {
        id,
        kind: FOLDER_TAB_KIND,
        resource,
    });
}
