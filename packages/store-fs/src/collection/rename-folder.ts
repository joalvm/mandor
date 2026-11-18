import { writeFolderSettings } from './write-folder-settings.js';

/**
 * Renames one folder — or one collection, which is the folder of the first level — by rewriting
 * the `name` in its file. The directory keeps its id, so everything under it, its order and the
 * position it has in its parent stay as they are.
 */
export async function renameFolder(
    root: string,
    workspaceId: string,
    path: string,
    name: string,
): Promise<void> {
    await writeFolderSettings(root, workspaceId, path, { name });
}
