import { shellStore } from '@mandor/shell';

import { reloadWorkspaces } from './reload-workspaces.js';

/**
 * A workspace that main made out of sight of this window — an import writes it whole. The list is
 * read again so the page shows it, and it becomes the open one, as the one made by hand does.
 */
export async function openNewWorkspace(workspaceId: string): Promise<void> {
    await reloadWorkspaces();

    shellStore.getState().setActiveWorkspace(workspaceId);
}
