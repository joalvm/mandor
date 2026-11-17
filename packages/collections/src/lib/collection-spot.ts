import { type CollectionNode, collectionPlace } from '@mandor/schema';

import { nodeAt } from './node-at.js';
import { isGroup } from './group-nodes.js';

/** Where a node ends up: the folder that will hold it, and the sibling it lands above. */
export type CollectionSpot = {
    /** The folder that receives it. Empty is the top level, whose order is the root file. */
    parent: string;
    /** The sibling it goes above, or `null` to send it to the end of that order. */
    before: string | null;
};

/** What a folder holds, or the top level when no folder was named. */
export function siblingsIn(
    nodes: readonly CollectionNode[],
    parent: string,
): readonly CollectionNode[] {
    if (parent === '') {
        return nodes;
    }

    const folder = nodeAt(nodes, parent);

    return folder !== null && isGroup(folder) ? folder.children : [];
}

/** The name that follows one of the siblings, or `null` when it is the last of them. */
export function nameAfter(siblings: readonly CollectionNode[], path: string): string | null {
    const at = siblings.findIndex((sibling) => sibling.path === path);

    if (at < 0) {
        return null;
    }

    const next = siblings[at + 1];

    return next === undefined ? null : collectionPlace(next.path).name;
}

/** A folder cannot land inside itself, and neither can it land inside what it already holds. */
export function spotHolds(spot: CollectionSpot, path: string): boolean {
    return spot.parent === path || spot.parent.startsWith(`${path}/`);
}

/**
 * The one shape the collection has: the top level holds collections, so an item has no place
 * beside them and a collection has no place inside a folder. A spot that breaks it is no spot.
 */
export function spotHoldsShape(node: CollectionNode, spot: CollectionSpot): boolean {
    return (node.kind === 'item') === (spot.parent !== '');
}
