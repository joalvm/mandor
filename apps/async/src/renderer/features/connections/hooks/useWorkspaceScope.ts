import { useShellStore } from '@mandor/shell';
import { useMemo } from 'react';

import type { WorkspaceScope } from '../lib/workspace-scope.js';

/**
 * Where the window is working right now. The section reads it instead of being handed it, so
 * whoever draws the sidebar does not have to know that connections live in a workspace.
 */
export function useWorkspaceScope(): WorkspaceScope | null {
    const originId = useShellStore((state) => state.activeOriginId);
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    return useMemo(() => {
        if (originId === null || workspaceId === null) {
            return null;
        }

        return { workspaceId };
    }, [originId, workspaceId]);
}
