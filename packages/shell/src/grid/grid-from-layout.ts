import { ROOT_GROUP_ID, type GridAxis, type GridLeaf, type GridNode } from '@mandor/ipc';
import { Orientation, type SerializedDockview } from 'dockview';

import { WHOLE } from './grid-sashes.js';
import type { Tab } from '../tab/tab.js';

/** What the view writes down about a group: which panels it holds and which one is in front. */
type LeafData = { activeView?: string; id?: string; views?: string[] };

/**
 * A node of the arrangement the view answers with, said in full.
 *
 * The library describes it with a name it does not export, so what comes out of a node of it is
 * anything at all. Reading it needs a shape, and this is that shape, checked at the one place
 * the arrangement crosses over.
 */
type LayoutNode =
    | { type: 'branch'; size?: number; data: LayoutNode[] }
    | { type: 'leaf'; size?: number; data: LeafData };

/**
 * Reads the tree the view arranged back into the words of the session.
 *
 * Dragging is the one gesture that starts in the view, so the view answers with a whole
 * arrangement instead of with a move, and the session takes it as an arrangement. Nothing the
 * view invented crosses over: every tab is one the session already had, looked up by name, and
 * a panel it never opened is left where it was found.
 */
export function gridFrom(
    layout: Pick<SerializedDockview, 'grid'>,
    tabs: ReadonlyMap<string, Tab>,
): GridNode {
    const axis = layout.grid.orientation === Orientation.VERTICAL ? 'column' : 'row';

    return nodeFrom(layout.grid.root as LayoutNode, axis, tabs);
}

/** A split of one group is that group: the view needs the wrapper, the tree has no use for it. */
function nodeFrom(node: LayoutNode, axis: GridAxis, tabs: ReadonlyMap<string, Tab>): GridNode {
    if (node.type === 'leaf') {
        return leafFrom(node.data, tabs);
    }

    const children = node.data.map((child) => nodeFrom(child, flipped(axis), tabs));
    const [only] = children;

    if (children.length === 1 && only !== undefined) {
        return only;
    }

    return {
        kind: 'branch',
        axis,
        sizes: sharesOf(node.data.map((child) => child.size ?? 0)),
        children,
    };
}

function leafFrom(data: LeafData, tabs: ReadonlyMap<string, Tab>): GridLeaf {
    const open = (data.views ?? [])
        .map((view) => tabs.get(view))
        .filter((tab) => tab !== undefined);
    const active = open.find((tab) => tab.id === data.activeView);

    return {
        kind: 'leaf',
        id: data.id ?? ROOT_GROUP_ID,
        tabs: open,
        activeTab: active?.id ?? null,
    };
}

/**
 * The pixels the view measured, said as shares of the axis.
 *
 * The last share is what the others left over, so the tree that comes back adds up to the whole
 * however the rounding fell. A view that has not been on screen yet measured nothing, and an
 * axis nobody has moved a separator on is shared out evenly.
 */
function sharesOf(sizes: number[]): number[] {
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const even = WHOLE / sizes.length;
    const shares = sizes.map((size) => Math.round(total > 0 ? (size / total) * WHOLE : even));
    const rest = shares.slice(0, -1);

    return [...rest, WHOLE - rest.reduce((sum, share) => sum + share, 0)];
}

/** The axis a split takes inside another: the one across it. */
const FLIPPED: Readonly<Record<GridAxis, GridAxis>> = { column: 'row', row: 'column' };

function flipped(axis: GridAxis): GridAxis {
    return FLIPPED[axis];
}
