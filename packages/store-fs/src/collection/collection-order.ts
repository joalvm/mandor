import { holderOf } from './collection-level.js';
import { readFolderSettings } from './read-folder-settings.js';
import { writeFolderSettings } from './write-folder-settings.js';
import { readCollectionsFile } from './read-collections-file.js';
import { writeCollectionsFile } from './write-collections-file.js';

/**
 * The order of what hangs from one place. The top level keeps its own in the root file, and every
 * group keeps its children's in the file of its level, which `collection-level` names.
 */
export async function readOrder(
    root: string,
    workspaceId: string,
    parent: string,
): Promise<string[]> {
    if (holderOf(parent) === 'root') {
        return (await readCollectionsFile(root, workspaceId)).order;
    }

    return (await readFolderSettings(root, workspaceId, parent)).order;
}

/** Writes an order back without touching anything else the place says about itself. */
export async function writeOrder(
    root: string,
    workspaceId: string,
    parent: string,
    order: string[],
): Promise<void> {
    if (holderOf(parent) === 'root') {
        const collection = await readCollectionsFile(root, workspaceId);

        await writeCollectionsFile(root, workspaceId, { ...collection, order });

        return;
    }

    await writeFolderSettings(root, workspaceId, parent, { order });
}
