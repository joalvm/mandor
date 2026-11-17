import type { FolderChainLevel } from '@mandor/schema';
import { fireAndForget, useRepoChanged } from '@mandor/shell';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { envStore } from '../env-store.js';
import { chainKey, loadFolderChain, NO_CHAIN, reloadFolderChains } from '../lib/folder-chains.js';

/**
 * The chain above a place — every collection and folder, the closest first, and the workspace
 * last — as main reads it from disk. It is read once per place and kept, and read again when
 * the collections or the workspace change on disk without the window. Without a workspace
 * there is no chain.
 */
export function useFolderChain(
    workspaceId: string | null,
    parentPath: string | null,
): FolderChainLevel[] {
    const key = workspaceId === null ? null : chainKey(workspaceId, parentPath);
    const levels = useStore(envStore, (state) =>
        key === null ? NO_CHAIN : (state.folderChains[key] ?? NO_CHAIN),
    );

    useEffect(() => {
        if (workspaceId !== null) {
            fireAndForget(loadFolderChain(workspaceId, parentPath));
        }
    }, [workspaceId, parentPath]);

    useRepoChanged(
        (entity) =>
            (entity.area === 'collections' || entity.area === 'workspace') &&
            entity.workspaceId === workspaceId,
        () => {
            if (workspaceId !== null) {
                fireAndForget(reloadFolderChains(workspaceId));
            }
        },
    );

    return levels;
}
