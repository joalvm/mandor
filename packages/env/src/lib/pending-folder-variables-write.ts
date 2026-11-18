import type { ErrorCode } from '@mandor/ipc';
import type { FolderChainLevel, Variable } from '@mandor/schema';
import { bridge, createPendingWrites } from '@mandor/shell';

import { envStore } from '../env-store.js';
import { chainKey, reloadFolderChains } from './folder-chains.js';
import { writableVariables } from './writable-variables.js';

type VariablesWrite = {
    workspaceId: string;
    path: string;
    variables: Variable[];
    onRefused: (code: ErrorCode) => void;
};

const PENDING = createPendingWrites<string, VariablesWrite>((_key, write) => writeNow(write));

/**
 * Shows the variables of a group at once in the chain every field of it reads, and writes them a
 * moment after the last key, like an environment. A list that cannot be written yet — a line
 * with a name Mandor cannot use — stays on screen and waits. A refusal is told, and the screen
 * goes back to what the disk holds.
 */
export function scheduleFolderVariablesWrite(
    workspaceId: string,
    path: string,
    variables: readonly Variable[],
    onRefused: (code: ErrorCode) => void,
): void {
    const key = chainKey(workspaceId, path);
    const writable = writableVariables(variables);

    keepLevelVariables(key, [...variables]);

    if (writable === null) {
        PENDING.cancel(key);

        return;
    }

    PENDING.schedule(key, { workspaceId, path, variables: writable, onRefused });
}

/** Writes now what waits for a group, before its chain is read again. */
export function flushFolderVariablesWrite(workspaceId: string, path: string): Promise<void> {
    return PENDING.flush(chainKey(workspaceId, path));
}

/** The first level of the chain of a group is the group itself: that is the one being edited. */
function keepLevelVariables(key: string, variables: Variable[]): void {
    envStore.setState((state) => {
        const [own, ...above] = state.folderChains[key] ?? [];

        if (own === undefined) {
            return {};
        }

        const edited: FolderChainLevel = { ...own, settings: { ...own.settings, variables } };

        return { folderChains: { ...state.folderChains, [key]: [edited, ...above] } };
    });
}

async function writeNow(write: VariablesWrite): Promise<void> {
    const { workspaceId, path, variables, onRefused } = write;
    const result = await bridge.collections.writeSettings({
        workspaceId,
        path,
        patch: { variables },
    });

    if (!result.ok) {
        onRefused(result.error.code);
    }

    // Every item under the group reads a chain that holds it: they all hear the new values.
    await reloadFolderChains(workspaceId);
}
