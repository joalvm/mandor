import { bridge, createPendingWrites } from '@mandor/shell';

import { folderKey, keepFolderDescription } from './folder-description.js';

type DescriptionWrite = { workspaceId: string; path: string; description: string };

const PENDING = createPendingWrites<string, DescriptionWrite>((_key, write) => writeNow(write));

/**
 * Shows the words of a group at once and writes them a moment after the last key, as a doc does.
 * An empty text takes the key out of the file.
 */
export function scheduleFolderDescriptionWrite(
    workspaceId: string,
    path: string,
    description: string,
): void {
    const key = folderKey(workspaceId, path);

    keepFolderDescription(key, description);
    PENDING.schedule(key, { workspaceId, path, description });
}

/** Writes now what waits for a group, before its file is read again. */
export function flushFolderDescriptionWrite(workspaceId: string, path: string): Promise<void> {
    return PENDING.flush(folderKey(workspaceId, path));
}

async function writeNow({ workspaceId, path, description }: DescriptionWrite): Promise<void> {
    await bridge.collections.writeSettings({ workspaceId, path, patch: { description } });
}
