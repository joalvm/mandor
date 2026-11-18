import type { Environment } from '@mandor/schema';
import { createPendingWrites } from '@mandor/shell';

import { envStore } from '../env-store.js';
import { writableVariables } from './writable-variables.js';

type EnvironmentWrite = { workspaceId: string; environment: Environment };

const PENDING = createPendingWrites<string, EnvironmentWrite>((_key, write) =>
    envStore.getState().update(write.workspaceId, write.environment.id, {
        name: write.environment.name,
        variables: write.environment.variables,
    }),
);

function keyOf(workspaceId: string, environmentId: string): string {
    return `${workspaceId}/${environmentId}`;
}

/** Keeps the pending write alive even when its tab closes. */
export function scheduleEnvironmentWrite(workspaceId: string, environment: Environment): void {
    PENDING.schedule(keyOf(workspaceId, environment.id), { workspaceId, environment });
}

/**
 * Sends every write of the workspace's environments still waiting for the typing to stop, now:
 * the files are about to be read again.
 */
export function flushPendingEnvironmentWrites(workspaceId: string): Promise<void> {
    return PENDING.flushWhere((key) => key.startsWith(`${workspaceId}/`));
}

/**
 * Writes only what could be read back. A variable whose name no interpolation would ever match
 * stays on screen for the typist to finish, and the last good version stays on disk.
 */
export function scheduleValidEnvironmentWrite(workspaceId: string, environment: Environment): void {
    const variables = writableVariables(environment.variables);

    if (variables === null) {
        cancelEnvironmentWrite(workspaceId, environment.id);

        return;
    }

    scheduleEnvironmentWrite(workspaceId, { ...environment, variables });
}

export function cancelEnvironmentWrite(workspaceId: string, environmentId: string): void {
    PENDING.cancel(keyOf(workspaceId, environmentId));
}
