import { stat } from 'node:fs/promises';

import { collectionPlace } from '@mandor/schema';
import { folderDir, itemFile, orderFile } from '@mandor/store-fs';

import { repoRelative } from '../repo/repo-relative.js';

/**
 * Where the files of a collection node sit inside the repo, spelled for git. A change of the
 * collection hands these to the commit, and only these: an item is a file, a folder is a directory
 * with everything under it, and the order of a folder lives in the file of its parent.
 */
export function itemPlace(root: string, workspaceId: string, path: string): string {
    return repoRelative(root, itemFile(root, workspaceId, path));
}

export function folderPlace(root: string, workspaceId: string, path: string): string {
    return repoRelative(root, folderDir(root, workspaceId, path));
}

/** The file that holds the order of what hangs from `parent`: the root file, the file of the
 * collection at the first level, or the folder's own. */
export function orderPlace(root: string, workspaceId: string, parent: string): string {
    return repoRelative(root, orderFile(root, workspaceId, parent));
}

/**
 * Every file a change of `paths` can touch: the node in either of its two shapes and the order
 * of the folder that lists it. Whatever of that does not exist is left out by the commit, so a
 * caller never has to say whether a name is an item or a folder.
 */
export function nodePlaces(root: string, workspaceId: string, ...paths: string[]): string[] {
    const places = paths.flatMap((path) => [
        itemPlace(root, workspaceId, path),
        folderPlace(root, workspaceId, path),
        orderPlace(root, workspaceId, collectionPlace(path).parent),
    ]);

    return [...new Set(places)];
}

/** Whether `path` is a directory on disk, which is how a delete knows what it is naming. */
export function isFolder(root: string, workspaceId: string, path: string): Promise<boolean> {
    return stat(folderDir(root, workspaceId, path)).then(
        (info) => info.isDirectory(),
        () => false,
    );
}
