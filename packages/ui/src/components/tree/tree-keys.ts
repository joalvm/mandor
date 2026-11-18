import type { RowActivation, RowModifiers } from '../row/row-activation.js';
import { firstChildIndexOf, parentIndexOf, type TreeLine } from './tree-line.js';

/** A key as the tree reads it: the name and the modifiers held, whatever event carried them. */
export type TreeKey = RowModifiers & { key: string };

/**
 * What a key asks the tree to do. `focus` moves the focus alone; `extend` moves it and stretches
 * the selection from the anchor; the rest act where the focus already is.
 */
export type TreeCommand =
    | { index: number; kind: 'collapse' | 'expand' | 'extend' | 'focus' }
    | { activation: RowActivation; kind: 'press' }
    | { kind: 'all' | 'clear' | 'delete' };

type Read = (key: TreeKey, lines: readonly TreeLine[], index: number) => TreeCommand | null;

/** A move to another line, or nothing when the move stays where it is. */
function moveTo(key: TreeKey, index: number, target: number): TreeCommand | null {
    if (target === index || target < 0) {
        return null;
    }

    return { index: target, kind: key.shiftKey ? 'extend' : 'focus' };
}

function stepRight(lines: readonly TreeLine[], index: number): TreeCommand | null {
    const line = lines[index];

    if (line?.expanded === false) {
        return { index, kind: 'expand' };
    }

    const child = firstChildIndexOf(lines, index);

    return child < 0 ? null : { index: child, kind: 'focus' };
}

function stepLeft(lines: readonly TreeLine[], index: number): TreeCommand | null {
    if (lines[index]?.expanded === true) {
        return { index, kind: 'collapse' };
    }

    const parent = parentIndexOf(lines, index);

    return parent < 0 ? null : { index: parent, kind: 'focus' };
}

function press(key: TreeKey): TreeCommand {
    const { altKey, ctrlKey, metaKey, shiftKey } = key;

    return {
        activation: {
            altKey,
            ctrlKey,
            keep: key.key === 'Enter',
            metaKey,
            shiftKey,
            space: key.key === ' ',
        },
        kind: 'press',
    };
}

function all(key: TreeKey): TreeCommand | null {
    return key.ctrlKey || key.metaKey ? { kind: 'all' } : null;
}

/**
 * Every key a tree answers to, by name. What a key does is an entry here, not a branch of the
 * handler, so a key the table does not name is a key the tree leaves to someone else.
 */
const KEYS = new Map<string, Read>([
    [' ', press],
    ['A', all],
    ['ArrowDown', (key, lines, index) => moveTo(key, index, Math.min(index + 1, lines.length - 1))],
    ['ArrowLeft', (_key, lines, index) => stepLeft(lines, index)],
    ['ArrowRight', (_key, lines, index) => stepRight(lines, index)],
    ['ArrowUp', (key, _lines, index) => moveTo(key, index, index - 1)],
    ['Backspace', (key) => (key.metaKey ? { kind: 'delete' } : null)],
    ['Delete', () => ({ kind: 'delete' })],
    ['End', (key, lines, index) => moveTo(key, index, lines.length - 1)],
    ['Enter', press],
    ['Escape', () => ({ kind: 'clear' })],
    ['Home', (key, _lines, index) => moveTo(key, index, 0)],
    ['a', all],
]);

/**
 * What the key pressed on a line asks for, or `null` when the tree has nothing to do with it.
 * Alt is left alone whole: it belongs to whoever moves nodes around with it.
 */
export function treeCommandOf(
    key: TreeKey,
    lines: readonly TreeLine[],
    index: number,
): TreeCommand | null {
    const read = KEYS.get(key.key);

    if (key.altKey || read === undefined) {
        return null;
    }

    return read(key, lines, index);
}
