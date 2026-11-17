import type { InteropFile } from '@mandor/interop-core';

import type { BrunoDocument } from './bruno-tree.js';
import { readBru } from './read-bru-collection.js';
import { readOpenCollection } from './read-opencollection.js';
import { brunoRootsOf, filesOfRoot, type BrunoLayout } from './sniff-bruno.js';

/** How each layout of Bruno is read: a layout added to the sniff must add its reader here. */
const READERS: Record<BrunoLayout, (files: readonly InteropFile[]) => BrunoDocument> = {
    opencollection: readOpenCollection,
    bru: readBru,
};

/** The collections the files hold, each read with the reader of the layout it is written in. */
export function parseBrunoFiles(files: readonly InteropFile[]): BrunoDocument[] {
    const roots = brunoRootsOf(files);

    return roots.map((root) => READERS[root.layout](filesOfRoot(files, root, roots)));
}
