import type { GridAxis, GridNode } from '@mandor/ipc';

/** Sizes travel as shares of the whole, and the view scales them to the pixels it has. */
export const WHOLE = 100;

/** The smallest share of its axis a group can be squeezed into and still be there to click. */
export const MIN_SHARE = 5;

/** One separator: the branch it belongs to, which pair of children it sits between, and how. */
export type Sash = {
    path: number[];
    index: number;
    axis: GridAxis;
    sizes: number[];
};

/**
 * Every separator of the grid, a branch before the branches under it.
 *
 * The order is the one a depth-first walk of the tree gives, which is also the order the
 * separators appear in the document, so the two can be paired by position without the view
 * having to label anything.
 */
export function sashesOf(node: GridNode, path: number[] = []): Sash[] {
    if (node.kind === 'leaf') {
        return [];
    }

    const own = node.children.slice(1).map((_, index) => ({
        path,
        index,
        axis: node.axis,
        sizes: node.sizes,
    }));

    return [...own, ...node.children.flatMap((child, index) => sashesOf(child, [...path, index]))];
}

/**
 * Moves one separator by a share of its axis. What one child gains its neighbour loses, so a
 * drag never changes what the rest of the window is showing.
 */
export function resizedGrid(
    node: GridNode,
    path: number[],
    index: number,
    delta: number,
): GridNode {
    if (node.kind === 'leaf') {
        return node;
    }

    const [step, ...rest] = path;

    if (step === undefined) {
        return { ...node, sizes: shifted(node.sizes, index, delta) };
    }

    return {
        ...node,
        children: node.children.map((child, at) =>
            at === step ? resizedGrid(child, rest, index, delta) : child,
        ),
    };
}

function shifted(sizes: number[], index: number, delta: number): number[] {
    const before = sizes[index];
    const after = sizes[index + 1];

    if (before === undefined || after === undefined) {
        return sizes;
    }

    const room = clamped(delta, MIN_SHARE - before, after - MIN_SHARE);

    return sizes.map((size, at) => sizeAt(size, at, index, room));
}

function sizeAt(size: number, at: number, index: number, room: number): number {
    if (at === index) {
        return size + room;
    }

    return at === index + 1 ? size - room : size;
}

function clamped(value: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, value));
}
