import type { InteropFile } from '@mandor/interop-core';

import { baseNameOf, dirNamesOf } from './file-name.js';

/** A directory of the collection: the file that describes the folder, if any, and what it holds. */
export type DirNode = {
    name: string;
    folder: InteropFile | undefined;
    files: InteropFile[];
    dirs: DirNode[];
};

function dirAt(node: DirNode, name: string): DirNode {
    const found = node.dirs.find((dir) => dir.name === name);

    if (found !== undefined) {
        return found;
    }

    const dir: DirNode = { name, folder: undefined, files: [], dirs: [] };

    node.dirs.push(dir);

    return dir;
}

/**
 * The files as the directories they sit in. `folderFile` is the name of the file that
 * describes a folder (`folder.yml`, `folder.bru`): it is the folder's own and not one of its
 * items.
 */
export function dirTreeOf(files: readonly InteropFile[], folderFile: string): DirNode {
    const root: DirNode = { name: '', folder: undefined, files: [], dirs: [] };

    for (const file of files) {
        const base = baseNameOf(file.path);
        const parent = dirNamesOf(file.path).reduce(dirAt, root);

        if (base === folderFile) {
            parent.folder = file;
        } else {
            parent.files.push(file);
        }
    }

    return root;
}
