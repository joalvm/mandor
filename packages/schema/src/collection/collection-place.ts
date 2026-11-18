import { segmentsOf } from '../id/path-id.js';

/** Where a path sits: the folder that holds it, and the name it goes by inside that folder. */
export type CollectionPlace = {
    /** The path of the holding folder. Empty for the top level, whose order is the root file. */
    parent: string;
    name: string;
};

/**
 * Takes a collection path apart. `segmentsOf` validates first, so no `..` reaches a join. The window
 * and main read it the same way: a path id is segments joined by a slash, and nothing about it
 * needs a filesystem to be read.
 */
export function collectionPlace(path: string): CollectionPlace {
    const parent = segmentsOf(path).slice(0, -1).join('/');

    // The name is what follows the parent and its slash; at the top level it is the whole path.
    return { parent, name: parent === '' ? path : path.slice(parent.length + 1) };
}

/**
 * Where a name sits under a parent. The top level has no prefix, and joining onto it would give
 * every path at the root a leading slash.
 */
export function childPath(parent: string, name: string): string {
    return parent === '' ? name : `${parent}/${name}`;
}
