import { createContext, useContext, type KeyboardEvent } from 'react';

import type { RowActivation } from '../row/row-activation.js';

/**
 * What one line of a tree needs to draw itself and to answer: where it sits, what state it is
 * in, and whom to tell when it is pressed, folded or focused. The tree hands it down to every
 * line it draws, so a row is written with no props at all and a feature cannot give it a level
 * or a selection the tree does not know about.
 */
export type TreeLineScope = {
    /** Whether the tree draws the chevron of each folder in the gutter its rows reserve. */
    chevrons: boolean;
    /** Set on the line the keyboard moved to, until it takes the focus it was given. */
    claimsFocus: boolean;
    expanded: boolean | undefined;
    level: number;
    onClaimed: () => void;
    onFocus: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onPress: (activation: RowActivation) => void;
    /** The chevron of the line was pressed: open it if it is folded, fold it if it is open. */
    onToggle: () => void;
    /** Absent in a tree that takes no selection, so the line says nothing about it. */
    selected: boolean | undefined;
    /** The one line of the tree the tabulator lands on. */
    tabStop: boolean;
};

const TreeLineContext = createContext<TreeLineScope | null>(null);

export const TreeLineProvider = TreeLineContext.Provider;

/** The scope of the line being drawn. A row outside a tree has none, and that is a mistake. */
export function useTreeLine(): TreeLineScope {
    const line = useContext(TreeLineContext);

    if (line === null) {
        throw new Error('A tree row can only be drawn inside a Tree.');
    }

    return line;
}
