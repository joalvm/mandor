import type { Environment } from '@mandor/schema';
import { fireAndForget, useRepoChanged, useShellStore } from '@mandor/shell';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { envStore } from '../env-store.js';
import { reloadEnvironments } from '../lib/reload-environments.js';

/**
 * The environments of the workspace on screen, brought in by whoever is going to show them.
 * The picker stopped loading them when it stopped reading them: a control that draws what it is
 * handed cannot also be the one that fetches it.
 */
export function useEnvironments(): readonly Environment[] {
    useEnvironmentsRead();

    return useStore(envStore, (state) => state.environments);
}

/**
 * Reads the environments of the workspace on screen into the store, and nothing else: whoever
 * only brings them in does not draw again each time they change.
 *
 * They are read again when their files, or the file of the workspace that holds its variables,
 * change on disk without the window.
 */
export function useEnvironmentsRead(): void {
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    useEffect(() => {
        if (workspaceId !== null) {
            fireAndForget(envStore.getState().load(workspaceId));
        }
    }, [workspaceId]);

    useRepoChanged(
        (entity) =>
            entity.area === 'globals' ||
            ((entity.area === 'environment' || entity.area === 'workspace') &&
                entity.workspaceId === workspaceId),
        () => {
            if (workspaceId !== null) {
                fireAndForget(reloadEnvironments(workspaceId));
            }
        },
    );
}
