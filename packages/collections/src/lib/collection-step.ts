import { type CollectionNode, collectionPlace } from '@mandor/schema';

import { nameAfter, siblingsIn, spotHoldsShape, type CollectionSpot } from './collection-spot.js';
import { isGroup } from './group-nodes.js';

/** The four moves a keyboard makes: within the siblings, into the folder over it, or out. */
export type CollectionStep = 'up' | 'down' | 'in' | 'out';

type Walk = {
    nodes: readonly CollectionNode[];
    siblings: readonly CollectionNode[];
    at: number;
    parent: string;
};

/**
 * Where a node lands after one keypress. Nothing at all means the step had nowhere to go —the
 * first of its siblings has no room over it— and that is an answer, not a failure: the tree
 * stays as it was and no channel is called.
 */
export function spotOfStep(
    nodes: readonly CollectionNode[],
    path: string,
    step: CollectionStep,
): CollectionSpot | null {
    const { parent } = collectionPlace(path);
    const siblings = siblingsIn(nodes, parent);
    const at = siblings.findIndex((node) => node.path === path);
    const walk: Walk = { nodes, siblings, at, parent };
    const node = siblings[walk.at];

    if (node === undefined) {
        return null;
    }

    const spot = SPOT_OF_STEP[step](walk);

    // The same shape the drag answers to: a step with nowhere legal to go leaves the tree as
    // it was, and no channel is called.
    return spot !== null && spotHoldsShape(node, spot) ? spot : null;
}

/** In is landing at the end of the folder right over the node. */
function spotIn(walk: Walk): CollectionSpot | null {
    const over = walk.siblings[walk.at - 1];

    return over !== undefined && isGroup(over) ? { parent: over.path, before: null } : null;
}

function spotUp(walk: Walk): CollectionSpot | null {
    const over = walk.siblings[walk.at - 1];

    return over === undefined ? null : { parent: walk.parent, before: nameOf(over) };
}

/** Down is landing over the sibling after the next one, or at the end when there is none. */
function spotDown(walk: Walk): CollectionSpot | null {
    const under = walk.siblings[walk.at + 1];
    const beyond = walk.siblings[walk.at + 2];

    if (under === undefined) {
        return null;
    }

    return { parent: walk.parent, before: beyond === undefined ? null : nameOf(beyond) };
}

/**
 * Out is landing right after the folder it was in, not at the end of the level above: a node
 * that steps out and steps back in has to find the same place it left.
 */
function spotOut({ nodes, parent }: Walk): CollectionSpot | null {
    if (parent === '') {
        return null;
    }

    const grand = collectionPlace(parent).parent;

    return { parent: grand, before: nameAfter(siblingsIn(nodes, grand), parent) };
}

/** Where each keypress takes the node. */
const SPOT_OF_STEP: Readonly<Record<CollectionStep, (walk: Walk) => CollectionSpot | null>> = {
    up: spotUp,
    down: spotDown,
    in: spotIn,
    out: spotOut,
};

function nameOf(node: CollectionNode): string {
    return collectionPlace(node.path).name;
}
