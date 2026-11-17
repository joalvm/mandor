import { fireAndForget, useRepoChanged } from '@mandor/shell';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { docsStore } from '../docs-store.js';
import { folderKey, keptFolders, loadFolderDescription } from '../lib/folder-description.js';
import { flushFolderDescriptionWrite } from '../lib/pending-folder-description-write.js';

/**
 * The words of a collection or a folder, from its own file: read once per place and kept, and
 * read again when the tree changes on disk without the window — what was typed and not yet
 * written goes first, so the read never runs over the typing. Undefined while the first read
 * is on its way.
 */
export function useFolderDescription(workspaceId: string, path: string): string | undefined {
    const text = useStore(
        docsStore,
        (state) => state.folderDescriptions[folderKey(workspaceId, path)],
    );

    useEffect(() => {
        fireAndForget(loadFolderDescription(workspaceId, path));
    }, [workspaceId, path]);

    useRepoChanged(
        (entity) => entity.area === 'collections' && entity.workspaceId === workspaceId,
        () => {
            fireAndForget(reloadFolders(workspaceId));
        },
    );

    return text;
}

async function reloadFolders(workspaceId: string): Promise<void> {
    await Promise.all(
        keptFolders(workspaceId).map(async (path) => {
            await flushFolderDescriptionWrite(workspaceId, path);
            await loadFolderDescription(workspaceId, path);
        }),
    );
}
