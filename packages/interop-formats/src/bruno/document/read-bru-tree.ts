import type { BrunoNode, BrunoSkipped } from './bruno-tree.js';
import type { DirNode } from './dir-tree.js';
import { ordered } from './order-nodes.js';
import { folderOfBru } from './read-bru-folder.js';
import { levelOfBru } from './read-bru-level.js';
import { requestOfBru } from './read-bru-request.js';

/** The folder a directory is: what its `folder.bru` says, and the files and directories in it. */
function folderOfDir(dir: DirNode, skipped: BrunoSkipped[]): BrunoNode {
    const level = levelOfBru(dir.folder);

    return folderOfBru(level, level.meta?.name ?? dir.name, nodesOfBruDir(dir, skipped));
}

/** The nodes a directory holds, in the order Bruno shows them. */
export function nodesOfBruDir(dir: DirNode, skipped: BrunoSkipped[]): BrunoNode[] {
    return ordered([
        ...dir.files.flatMap((file) => requestOfBru(file, skipped)),
        ...dir.dirs.map((child) => folderOfDir(child, skipped)),
    ]);
}
