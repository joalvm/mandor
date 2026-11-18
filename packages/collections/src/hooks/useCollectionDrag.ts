import type { CollectionNode } from '@mandor/schema';
import { TREE_INDENT } from '@mandor/ui';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/utils/combine';
import {
    draggable,
    dropTargetForElements,
    type ElementDragPayload,
} from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import {
    attachInstruction,
    extractInstruction,
    type Instruction,
    type ItemMode,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { useEffect, useState } from 'react';
import { fireAndForget, originName } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';
import { itemLeaf } from '../item-leaf-registry.js';
import { actedPaths } from '../lib/acted-paths.js';
import { spotOfInstruction } from '../lib/collection-instruction.js';
import { carriedExampleIn, takesExample, type CarriedExample } from '../lib/example-drop.js';
import { itemResource } from '../lib/item-resource.js';
import { placeCollectionNodes } from '../lib/place-collection-nodes.js';
import { topmostNodes } from '../lib/topmost-nodes.js';
import { isGroup } from '../lib/group-nodes.js';

/** Where the row draws the mark of a drop it is under: a line over it, under it, or a fill. */
export type CollectionDrop = 'above' | 'below' | 'inside';

type Options = { level: number; mode: ItemMode; node: CollectionNode; workspaceId: string };
type Data = Record<string | symbol, unknown>;

/** The mark of each reading of the hitbox; a reparent lands under the row, like a reorder below. */
const DROP_OF_INSTRUCTION: Readonly<Record<Instruction['type'], CollectionDrop | null>> = {
    'reorder-above': 'above',
    'reorder-below': 'below',
    'make-child': 'inside',
    reparent: 'below',
    // A blocked instruction marks nothing: the row says «not here» by staying as it was.
    'instruction-blocked': null,
};

function dropOf(instruction: Instruction | null): CollectionDrop | null {
    if (instruction === null) {
        return null;
    }

    return DROP_OF_INSTRUCTION[instruction.type];
}

/** What the drag carries is the paths of the nodes it took, and nothing else travels with it. */
function pathsIn(data: Data): string[] {
    const paths = data['paths'];

    return Array.isArray(paths) ? paths.filter((path) => typeof path === 'string') : [];
}

/** A row takes the drop unless it is one of the nodes carried, or sits inside one of them. */
function takesDrop(paths: readonly string[], path: string): boolean {
    return paths.length > 0 && !paths.some((one) => path === one || path.startsWith(`${one}/`));
}

/** Only a folder can take something inside it, so over an item that reading is taken out. */
function blockedOn(node: CollectionNode): Instruction['type'][] {
    return isGroup(node) ? [] : ['make-child'];
}

function landExample(carried: CarriedExample, options: Options): void {
    const target = itemResource(originName(), options.workspaceId, options.node.path);
    const moved = itemLeaf(carried.itemKind)?.examples?.move(carried.resource, target);

    fireAndForget(moved ?? Promise.resolve());
}

/** Where the mark of a drag goes: an example fills the row, nodes follow the hitbox. */
function markOf(options: Options, source: ElementDragPayload, data: Data): CollectionDrop | null {
    if (carriedExampleIn(source.data) !== null) {
        return 'inside';
    }

    const { nodes } = collectionStore.getState();
    const dragged = topmostNodes(nodes, pathsIn(source.data));
    const instruction = extractInstruction(data);
    const spot =
        instruction === null || dragged.length === 0
            ? null
            : spotOfInstruction(nodes, dragged, options.node, instruction);

    return spot === null ? null : dropOf(instruction);
}

function land(options: Options, source: ElementDragPayload, data: Data): void {
    const carried = carriedExampleIn(source.data);

    if (carried !== null) {
        landExample(carried, options);

        return;
    }

    const instruction = extractInstruction(data);
    const { nodes } = collectionStore.getState();
    const dragged = topmostNodes(nodes, pathsIn(source.data));
    const spot =
        instruction === null || dragged.length === 0
            ? null
            : spotOfInstruction(nodes, dragged, options.node, instruction);

    if (spot !== null) {
        fireAndForget(placeCollectionNodes(options.workspaceId, dragged, spot));
    }
}

/**
 * The row as something to take and something to drop on. Taking a row that is among the ones
 * taken carries all of them, the way the Delete key acts on them all. The hitbox turns the
 * pointer into an instruction —over, under, inside, or out to a level above— and the drop is the
 * only moment anything is written: a gesture that is cancelled, or let go elsewhere, costs nothing.
 */
export function useCollectionDrag(
    element: HTMLElement | null,
    options: Options,
): CollectionDrop | null {
    const [drop, setDrop] = useState<CollectionDrop | null>(null);
    const { level, mode, node, workspaceId } = options;

    useEffect(() => {
        if (element === null) {
            return undefined;
        }

        return combine(
            draggable({
                element,
                getInitialData: () => ({
                    paths: actedPaths(collectionStore.getState().selected, node.path),
                }),
            }),
            dropTargetForElements({
                canDrop: ({ source }) =>
                    takesDrop(pathsIn(source.data), node.path) ||
                    takesExample(carriedExampleIn(source.data), node),
                element,
                getData: ({ element: over, input }) =>
                    attachInstruction(
                        { path: node.path },
                        {
                            block: blockedOn(node),
                            currentLevel: level,
                            element: over,
                            indentPerLevel: TREE_INDENT,
                            input,
                            mode,
                        },
                    ),
                onDrag: ({ self, source }) => {
                    // The mark follows the same reading the drop does, so a destination the
                    // shape of the collection refuses never glows as if it would take one.
                    setDrop(markOf({ level, mode, node, workspaceId }, source, self.data));
                },
                onDragLeave: () => {
                    setDrop(null);
                },
                onDrop: ({ self, source }) => {
                    setDrop(null);
                    land({ level, mode, node, workspaceId }, source, self.data);
                },
            }),
        );
    }, [element, level, mode, node, workspaceId]);

    return drop;
}
