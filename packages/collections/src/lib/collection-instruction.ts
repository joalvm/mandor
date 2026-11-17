import { type CollectionNode, collectionPlace } from '@mandor/schema';
import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import {
    nameAfter,
    siblingsIn,
    spotHolds,
    spotHoldsShape,
    type CollectionSpot,
} from './collection-spot.js';
import { isGroup } from './group-nodes.js';

type Drag = {
    dragged: ReadonlySet<string>;
    nodes: readonly CollectionNode[];
    target: CollectionNode;
};

type InstructionOf<T extends Instruction['type']> = Extract<Instruction, { type: T }>;

/**
 * Where a drop leaves the nodes the pointer was carrying, all of them in one spot. The hitbox
 * says what the gesture meant over the row underneath —above it, below it, inside it, or out at
 * some level above— and this turns that into the one thing the disk understands: a folder and
 * the sibling to land above. A spot inside any folder being carried takes none of them.
 */
export function spotOfInstruction(
    nodes: readonly CollectionNode[],
    dragged: readonly CollectionNode[],
    target: CollectionNode,
    instruction: Instruction,
): CollectionSpot | null {
    const drag: Drag = { dragged: new Set(dragged.map((node) => node.path)), nodes, target };
    const spot = spotFor(drag, instruction);

    if (spot === null || dragged.some((node) => spotHolds(spot, node.path))) {
        return null;
    }

    // The top level holds collections: an item has no sibling there to stand beside, and a
    // collection has no folder to become a child of. A spot that breaks the shape is no spot.
    return dragged.every((node) => spotHoldsShape(node, spot)) ? spot : null;
}

function spotAbove(drag: Drag): CollectionSpot {
    const { parent, name } = collectionPlace(drag.target.path);

    return { parent, before: name };
}

function spotBelow(drag: Drag): CollectionSpot {
    const { parent } = collectionPlace(drag.target.path);

    return { parent, before: nameAfter(without(drag, parent), drag.target.path) };
}

function spotInside(drag: Drag): CollectionSpot | null {
    return isGroup(drag.target) ? { parent: drag.target.path, before: null } : null;
}

/**
 * A reparent names a level above the row it was dropped on, so the node lands beside whichever
 * ancestor of that row sits at it. Climbing the path is the whole of it: a level is a segment.
 */
function spotBesideAncestor(
    drag: Drag,
    { currentLevel, desiredLevel }: InstructionOf<'reparent'>,
): CollectionSpot | null {
    const climb = currentLevel - desiredLevel;
    const segments = drag.target.path.split('/');
    const ancestor = segments.slice(0, segments.length - climb).join('/');

    if (ancestor === '') {
        return null;
    }

    const { parent } = collectionPlace(ancestor);

    return { parent, before: nameAfter(without(drag, parent), ancestor) };
}

/** Where each reading of the hitbox leaves the nodes; a blocked one leaves them nowhere. */
const SPOT_OF_INSTRUCTION: {
    [T in Instruction['type']]: (
        drag: Drag,
        instruction: InstructionOf<T>,
    ) => CollectionSpot | null;
} = {
    'reorder-above': spotAbove,
    'reorder-below': spotBelow,
    'make-child': spotInside,
    reparent: spotBesideAncestor,
    'instruction-blocked': () => null,
};

function spotIn<T extends Instruction['type']>(
    type: T,
    drag: Drag,
    instruction: InstructionOf<T>,
): CollectionSpot | null {
    return SPOT_OF_INSTRUCTION[type](drag, instruction);
}

function spotFor(drag: Drag, instruction: Instruction): CollectionSpot | null {
    return spotIn(instruction.type, drag, instruction);
}

/** The siblings of a folder as they will look once the dragged nodes have left them. */
function without(drag: Drag, parent: string): readonly CollectionNode[] {
    return siblingsIn(drag.nodes, parent).filter((node) => !drag.dragged.has(node.path));
}
