import { useRef, type KeyboardEvent } from 'react';

import type { RowActivation } from '../row/row-activation.js';
import { collapse, expand, extend, moveFocus, press, type TreeState } from './tree-actions.js';
import { treeCommandOf, type TreeCommand } from './tree-keys.js';
import { actedOn } from './tree-selection.js';

type TreeCommandsInput = Omit<TreeState, 'anchor'>;

export type TreeCommands = {
    keyDown: (event: KeyboardEvent<HTMLElement>, index: number) => void;
    press: (index: number, activation: RowActivation) => void;
    toggle: (index: number) => void;
};

type Move = Extract<TreeCommand, { index: number }>['kind'];
type Act = Extract<TreeCommand, { kind: 'all' | 'clear' | 'delete' }>['kind'];

const MOVES: Readonly<Record<Move, (tree: TreeState, target: number, source: number) => void>> = {
    collapse: (tree, target) => {
        collapse(tree, target);
    },
    expand: (tree, target) => {
        expand(tree, target);
    },
    extend,
    focus: (tree, target) => {
        moveFocus(tree, target);
    },
};

const ACTS: Readonly<Record<Act, (tree: TreeState, source: number) => void>> = {
    all: (tree) => {
        tree.onSelectedChange?.(tree.lines.map((line) => line.id));
    },
    clear: (tree) => {
        tree.onSelectedChange?.([]);
    },
    delete: (tree, source) => {
        const line = tree.lines[source];

        if (line !== undefined) {
            tree.onDelete?.(actedOn(tree.lines, tree.selected, line.id));
        }
    },
};

function always(): boolean {
    return true;
}

/**
 * Whether the tree has anything to do with each command. A key it cannot act on stays with the
 * page: Escape with nothing taken still closes the dialog the tree sits in.
 */
const APPLIES: Readonly<Record<TreeCommand['kind'], (tree: TreeState) => boolean>> = {
    all: (tree) => tree.onSelectedChange !== undefined,
    clear: (tree) => tree.selected.length > 0,
    collapse: always,
    delete: (tree) => tree.onDelete !== undefined,
    expand: always,
    extend: always,
    focus: always,
    press: always,
};

function run(tree: TreeState, command: TreeCommand, index: number): void {
    if (command.kind === 'press') {
        press(tree, index, command.activation);

        return;
    }

    if ('index' in command) {
        MOVES[command.kind](tree, command.index, index);

        return;
    }

    ACTS[command.kind](tree, index);
}

/** Keys pressed on a control inside a line belong to the control, not to the tree. */
function keyDown(tree: TreeState, event: KeyboardEvent<HTMLElement>, index: number): void {
    const command = treeCommandOf(event, tree.lines, index);

    if (event.target !== event.currentTarget || event.defaultPrevented || command === null) {
        return;
    }

    if (APPLIES[command.kind](tree)) {
        event.preventDefault();
        run(tree, command, index);
    }
}

/** Everything a line of the tree can be asked to do, bound to the tree as it stands now. */
export function useTreeCommands(input: TreeCommandsInput): TreeCommands {
    const anchor = useRef<string | null>(null);
    const tree: TreeState = { ...input, anchor };

    return {
        keyDown: (event, index) => {
            keyDown(tree, event, index);
        },
        press: (index, activation) => {
            press(tree, index, activation);
        },
        toggle: (index) => {
            if (tree.lines[index]?.expanded === true) {
                collapse(tree, index);

                return;
            }

            expand(tree, index);
        },
    };
}
