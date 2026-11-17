import type { RowModifiers } from '../row/row-activation.js';
import type { TreeLine } from './tree-line.js';

/**
 * The lines taken, and the one a range with Shift starts from. The anchor moves with every plain
 * or Ctrl press and stays put through the Shift ones, which is how a range is stretched and
 * shrunk from the same end, the way the explorer of VS Code and the sidebar of Postman do it.
 */
export type TreeSelection = {
    anchor: string | null;
    selected: readonly string[];
};

/** Every line from one to the other, both included, in the order they stand. */
function rangeBetween(lines: readonly TreeLine[], from: string, to: string): string[] {
    const start = lines.findIndex((line) => line.id === from);
    const end = lines.findIndex((line) => line.id === to);

    return lines.slice(Math.min(start, end), Math.max(start, end) + 1).map((line) => line.id);
}

function toggled(selected: readonly string[], id: string): string[] {
    return selected.includes(id) ? selected.filter((one) => one !== id) : [...selected, id];
}

/**
 * Ids in the order their lines stand, leaving out the ones no line carries any more. Looked up in
 * a set: a Ctrl press or a delete over a tree of ten thousand lines, all taken, compared a hundred
 * million pairs.
 */
function inLineOrder(lines: readonly TreeLine[], ids: readonly string[]): string[] {
    const taken = new Set(ids);

    return lines.filter((line) => taken.has(line.id)).map((line) => line.id);
}

/**
 * What a press leaves taken. Plain takes the line alone; Ctrl, or Cmd on a Mac, adds it or takes
 * it out; Shift takes the range from the anchor. An anchor that is not in sight any more — folded
 * away, deleted, never set — starts the range where the press lands.
 */
export function pressedSelection(
    lines: readonly TreeLine[],
    current: TreeSelection,
    id: string,
    activation: RowModifiers,
): TreeSelection {
    const anchor = current.anchor;

    if (activation.shiftKey) {
        const from = anchor !== null && lines.some((line) => line.id === anchor) ? anchor : id;

        return { anchor: from, selected: rangeBetween(lines, from, id) };
    }

    if (activation.ctrlKey || activation.metaKey) {
        return { anchor: id, selected: inLineOrder(lines, toggled(current.selected, id)) };
    }

    return { anchor: id, selected: [id] };
}

/**
 * What a gesture on the focused line acts on: the whole selection when the line is part of it,
 * and the line alone when it is not. Deleting with the focus outside what is taken deletes what
 * the eye is on, never a selection left somewhere else.
 */
export function actedOn(
    lines: readonly TreeLine[],
    selected: readonly string[],
    focused: string,
): string[] {
    return selected.includes(focused) ? inLineOrder(lines, selected) : [focused];
}
