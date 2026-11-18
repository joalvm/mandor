import type { ConcreteAuth } from '@mandor/schema';

import type { WorkspaceFolderNode } from './workspace-data.js';

/** What a level of the tree hands down to what hangs from it. */
export type WalkedLevel = Pick<WorkspaceFolderNode, 'name' | 'settings'>;

/** A folder as the walk finds it: where it stands and the auth its requests answer to. */
export type WalkedFolder = {
    folder: WorkspaceFolderNode;
    /** Names from the top of its collection down, its own last. */
    path: readonly string[];
    /** The auth it declares, else the closest one above it. */
    auth: ConcreteAuth | undefined;
    /** The levels its requests hang from, itself first and the farthest last. */
    levels: readonly WalkedLevel[];
};

/**
 * Every folder under a level, parents first. For a format with no levels of its own: what a
 * request inherits is worked out here, on the way down, and never stored in the tree.
 */
export function walkedFolders(
    folders: readonly WorkspaceFolderNode[],
    above: ConcreteAuth | undefined,
    path: readonly string[] = [],
    chain: readonly WalkedLevel[] = [],
): WalkedFolder[] {
    return folders.flatMap((folder) => {
        const auth = folder.settings.auth ?? above;
        const here = [...path, folder.name];
        const levels = [folder, ...chain];

        return [
            { folder, path: here, auth, levels },
            ...walkedFolders(folder.folders, auth, here, levels),
        ];
    });
}
