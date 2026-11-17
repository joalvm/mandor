import { envStore, useEnvironments } from '@mandor/env';
import type { Environment } from '@mandor/schema';
import { fireAndForget, useShellStore } from '@mandor/shell';
import { useStore } from 'zustand';

type WorkspaceEnvironment = {
    onChange: (environmentId: string | null) => void;
    options: readonly Environment[];
    value: string | null;
};

/**
 * Who owns the environment in Mandor Request: the workspace, one for every request open at once.
 * It is the other half of the row that Mandor Realtime answers with its connection, and the reason
 * the control itself knows neither.
 */
export function useWorkspaceEnvironment(): WorkspaceEnvironment {
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const options = useEnvironments();
    const activeIds = useStore(envStore, (state) => state.activeEnvironmentIds);
    const value = workspaceId === null ? null : (activeIds[workspaceId] ?? null);

    const onChange = (environmentId: string | null): void => {
        if (workspaceId === null) {
            return;
        }

        fireAndForget(envStore.getState().setActive(workspaceId, environmentId));
    };

    return { onChange, options, value };
}
