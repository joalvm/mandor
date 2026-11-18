import { parseResourceUri } from '@mandor/schema';
import { bridge } from '@mandor/shell';

import { docsStore } from '../docs-store.js';

/** One read in flight per place: a second view of the same folder waits for the first answer. */
const inFlight = new Set<string>();

/** The key the words of a group are kept under: its workspace and its path. */
export function folderKey(workspaceId: string, path: string): string {
    return `${workspaceId}\n${path}`;
}

/** Keeps the words of a group as the window shows them, before or after they reach the disk. */
export function keepFolderDescription(key: string, text: string): void {
    docsStore.setState((state) => ({
        folderDescriptions: { ...state.folderDescriptions, [key]: text },
    }));
}

/**
 * Reads the words of a collection or folder from the first level of its chain: the group itself.
 * A refusal keeps what was there; a group that says nothing reads as empty.
 */
export async function loadFolderDescription(workspaceId: string, path: string): Promise<void> {
    const key = folderKey(workspaceId, path);

    if (inFlight.has(key)) {
        return;
    }

    inFlight.add(key);

    try {
        const result = await bridge.collections.chain({ workspaceId, parentPath: path });

        if (result.ok) {
            keepFolderDescription(key, result.value[0]?.settings.description ?? '');
        }
    } finally {
        inFlight.delete(key);
    }
}

/** Every group of the workspace read so far, as `[workspaceId, path]`. */
export function keptFolders(workspaceId: string): string[] {
    return Object.keys(docsStore.getState().folderDescriptions)
        .filter((key) => key.startsWith(`${workspaceId}\n`))
        .map((key) => key.slice(workspaceId.length + 1));
}

/** The group the resource of a folder tab names; nothing for any other resource. */
export function folderOf(resource: string): { workspaceId: string; path: string } {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace') {
        return { workspaceId: '', path: '' };
    }

    return { workspaceId: parts.workspace, path: parts.path };
}
