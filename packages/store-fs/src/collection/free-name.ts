import { fileExists } from '../disk/file-exists.js';
import { folderDir, itemFile } from './collection-path.js';
import { NameTakenError } from './name-taken-error.js';

/**
 * Refuses before anything is written when the path already names something. A folder and an
 * item cannot share a name even though they are two different things on disk: the tree shows
 * one row per name, and two rows with the same name is a tree nobody can point at.
 */
export async function assertFreeName(
    root: string,
    workspaceId: string,
    path: string,
): Promise<void> {
    const taken =
        (await fileExists(itemFile(root, workspaceId, path))) ||
        (await fileExists(folderDir(root, workspaceId, path)));

    if (taken) {
        throw new NameTakenError(path);
    }
}
