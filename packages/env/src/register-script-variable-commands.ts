import type { ErrorCode } from '@mandor/ipc';
import { bridge, fireAndForget, registerCommand, type ShellStore } from '@mandor/shell';

import { envStore } from './env-store.js';

/**
 * Forgets what scripts set in a workspace: main first, which holds the values the next send
 * reads, and then the window, which only shows their previews. A refusal leaves the window
 * showing what main still holds, and hands the code back.
 */
export async function clearScriptVariables(workspaceId: string): Promise<ErrorCode | null> {
    const result = await bridge.scripts.clearVariables(workspaceId);

    if (!result.ok) {
        return result.error.code;
    }

    envStore.getState().dropScriptVariables(workspaceId);

    return null;
}

/** Whether a script set anything, in any environment, of the workspace in front. */
function hasScriptVariables(state: ShellStore): boolean {
    const workspaceId = state.activeWorkspaceId;
    const set = workspaceId === null ? undefined : envStore.getState().scriptVariables[workspaceId];

    return Object.values(set ?? {}).some((variables) => variables.length > 0);
}

/**
 * The command of the palette that starts the scripts of the workspace in front from nothing set.
 * It is offered only while there is something to forget. The failure is told where the reader is
 * looking: the caller hands in the way to say it, because a command is not React.
 */
export function registerScriptVariableCommands(onFailure: (code: ErrorCode) => void): () => void {
    return registerCommand({
        category: 'commands:categoryWorkspace',
        icon: 'delete',
        id: 'scripts.clearVariables',
        run: (state) => {
            const workspaceId = state.activeWorkspaceId;

            if (workspaceId === null) {
                return;
            }

            fireAndForget(
                clearScriptVariables(workspaceId).then((code) => {
                    if (code !== null) {
                        onFailure(code);
                    }
                }),
            );
        },
        title: 'commands:clearScriptVariables',
        when: hasScriptVariables,
    });
}
