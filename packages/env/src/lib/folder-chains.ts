import type { FolderChainLevel } from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { envStore } from '../env-store.js';

/** One identity for the empty chain, so a field that already showed none does not draw again. */
export const NO_CHAIN: FolderChainLevel[] = [];

/** One read in flight per place: a second field of the same tab waits for the first answer. */
const inFlight = new Set<string>();

/** The key a chain is kept under: the workspace and the folder, never shown to anyone. */
export function chainKey(workspaceId: string, parentPath: string | null): string {
    return `${workspaceId}\n${parentPath ?? ''}`;
}

/**
 * Asks main for the chain above a place and keeps the answer. A refusal keeps what was there:
 * a field that lost its chain for a moment would repaint every token as missing.
 */
export async function loadFolderChain(
    workspaceId: string,
    parentPath: string | null,
): Promise<void> {
    const key = chainKey(workspaceId, parentPath);

    if (inFlight.has(key)) {
        return;
    }

    inFlight.add(key);

    try {
        const result = await bridge.collections.chain({ workspaceId, parentPath });

        if (result.ok) {
            keep(key, result.value);
        }
    } finally {
        inFlight.delete(key);
    }
}

/** Reads again every chain of the workspace kept so far: what is on screen follows disk. */
export async function reloadFolderChains(workspaceId: string): Promise<void> {
    const keys = Object.keys(envStore.getState().folderChains);
    const mine = keys.filter((key) => key.startsWith(`${workspaceId}\n`));

    await Promise.all(
        mine.map((key) => {
            const parentPath = key.slice(workspaceId.length + 1);

            return loadFolderChain(workspaceId, parentPath === '' ? null : parentPath);
        }),
    );
}

function keep(key: string, levels: FolderChainLevel[]): void {
    const kept = levels.length === 0 ? NO_CHAIN : levels;

    envStore.setState((state) => ({ folderChains: { ...state.folderChains, [key]: kept } }));
}
