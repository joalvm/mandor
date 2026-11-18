import { nameOnDisk } from '../repo/name-on-disk.js';
import { isFolder, itemPlace, orderPlace } from './collection-places.js';

/**
 * The name a person reads for one node of the collection, taken from its file. A folder or a
 * collection carries it in the file that also holds its order; an item carries it in its own.
 * `''` when the node is gone, which a commit subject reads as `unnamed`.
 */
export async function nodeName(root: string, workspaceId: string, path: string): Promise<string> {
    const place = (await isFolder(root, workspaceId, path))
        ? orderPlace(root, workspaceId, path)
        : itemPlace(root, workspaceId, path);

    return nameOnDisk(root, place);
}

/**
 * The name of what holds a node: the folder or the collection above it, or the workspace itself
 * at the top level, whose order file goes by the name of its workspace.
 */
export function holderName(root: string, workspaceId: string, parent: string): Promise<string> {
    return nameOnDisk(root, orderPlace(root, workspaceId, parent));
}
