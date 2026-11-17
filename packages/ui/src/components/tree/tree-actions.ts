import type { RefObject } from 'react';

import type { RowActivation } from '../row/row-activation.js';
import { descendantIdsOf, type TreeLine } from './tree-line.js';
import { pressedSelection } from './tree-selection.js';
import type { TreeFocus } from './useTreeFocus.js';

/** What a tree tells whoever owns its nodes. Selection and deletion are optional; folding is not. */
export type TreeHandlers = {
    /** The activation says whether the user asked to keep what the line opens. */
    onActivate?: ((id: string, activation: RowActivation) => void) | undefined;
    onDelete?: ((ids: string[]) => void) | undefined;
    onExpandedChange: (id: string, expanded: boolean) => void;
    onSelectedChange?: ((ids: string[]) => void) | undefined;
};

/** The tree as one of its actions finds it: its lines, its focus, what is taken and whom to tell. */
export type TreeState = TreeHandlers & {
    /** Where the next Shift range starts: the last line taken without Shift. */
    anchor: { current: string | null };
    focus: TreeFocus;
    lines: readonly TreeLine[];
    scrollTo: (index: number) => void;
    scroller: RefObject<HTMLDivElement | null>;
    selected: readonly string[];
};

const SHIFT: RowActivation = {
    altKey: false,
    ctrlKey: false,
    keep: false,
    metaKey: false,
    shiftKey: true,
};

function isPlain(activation: RowActivation): boolean {
    return !activation.ctrlKey && !activation.metaKey && !activation.shiftKey;
}

function select(tree: TreeState, id: string, activation: RowActivation): void {
    const current = { anchor: tree.anchor.current, selected: tree.selected };
    const next = pressedSelection(tree.lines, current, id, activation);

    tree.anchor.current = next.anchor;
    tree.onSelectedChange?.([...next.selected]);
}

/**
 * A line pressed, with the mouse or with Enter and space. A tree that takes a selection moves it,
 * and only a plain press opens what the line is; a tree without one opens it on every press.
 */
export function press(tree: TreeState, index: number, activation: RowActivation): void {
    const line = tree.lines[index];

    if (line === undefined) {
        return;
    }

    tree.focus.take(line.id);

    if (tree.onSelectedChange !== undefined) {
        select(tree, line.id, activation);
    }

    if (tree.onSelectedChange === undefined || isPlain(activation)) {
        tree.onActivate?.(line.id, activation);
    }
}

export function moveFocus(tree: TreeState, index: number): void {
    const line = tree.lines[index];

    if (line === undefined) {
        return;
    }

    tree.focus.claim(line.id);
    tree.scrollTo(index);
}

/** Shift and an arrow: the range runs from the anchor, or from where the focus was, to here. */
export function extend(tree: TreeState, target: number, source: number): void {
    const line = tree.lines[target];

    tree.anchor.current ??= tree.lines[source]?.id ?? null;

    if (line !== undefined) {
        select(tree, line.id, SHIFT);
    }

    moveFocus(tree, target);
}

/** The focus follows into the folder only when it was inside the tree to begin with. */
function refocus(tree: TreeState, index: number): void {
    const line = tree.lines[index];

    if (tree.scroller.current?.contains(document.activeElement) === true) {
        moveFocus(tree, index);

        return;
    }

    if (line !== undefined) {
        tree.focus.take(line.id);
    }
}

/**
 * Folding hides lines, and nothing out of sight stays taken or focused: a key pressed afterwards
 * would act on what nobody sees. The focus comes back to the folder that swallowed it.
 */
export function collapse(tree: TreeState, index: number): void {
    const line = tree.lines[index];
    const hidden = new Set(descendantIdsOf(tree.lines, index));

    if (line === undefined) {
        return;
    }

    if (tree.focus.id !== null && hidden.has(tree.focus.id)) {
        refocus(tree, index);
    }

    if (tree.anchor.current !== null && hidden.has(tree.anchor.current)) {
        tree.anchor.current = line.id;
    }

    if (tree.selected.some((id) => hidden.has(id))) {
        tree.onSelectedChange?.(tree.selected.filter((id) => !hidden.has(id)));
    }

    tree.onExpandedChange(line.id, false);
}

export function expand(tree: TreeState, index: number): void {
    const line = tree.lines[index];

    if (line !== undefined) {
        tree.onExpandedChange(line.id, true);
    }
}
