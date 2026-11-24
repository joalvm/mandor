import type { KeyboardEvent, MouseEvent } from 'react';

/** The keys held while a row is taken, whatever event carried them. */
export type RowModifiers = {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
};

/**
 * What a row hands back when it is taken: the keys held, so the list decides what a modified
 * activation means, and whether the user asked to stay. A double click or Enter keeps what the
 * row opens; a single click or space only looks at it.
 */
export type RowActivation = RowModifiers & {
    keep: boolean;
    /**
     * Told by the keys only, and true for space: a list whose rows do two things — a folder that
     * folds and marks — gives one of them to space, which a click cannot say.
     */
    space?: boolean | undefined;
};

function modifiersOf({ altKey, ctrlKey, metaKey, shiftKey }: RowModifiers): RowModifiers {
    return { altKey, ctrlKey, metaKey, shiftKey };
}

/** A click on a row: the second click of a double click is the one that keeps. */
export function clickActivation(event: MouseEvent<HTMLElement>): RowActivation {
    return { ...modifiersOf(event), keep: event.detail > 1 };
}

/**
 * Whether a click landed on the row as the page draws it. React hands a row the events of what
 * it opens in a portal too —its menu, the dialog of its settings—, and those are not the row's.
 */
export function clickedOnRow(event: MouseEvent<HTMLElement>): boolean {
    return event.target instanceof Node && event.currentTarget.contains(event.target);
}

/**
 * Runs the action of a row for the keys that take one — Enter and space — and no others, pressed
 * on the row itself. A control inside it, or a field of what it opened in a portal, keeps them:
 * there Enter writes a line and space a space.
 */
export function activateRow(
    event: KeyboardEvent<HTMLElement>,
    take: (activation: RowActivation) => void,
): void {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
    }

    event.preventDefault();
    take({ ...modifiersOf(event), keep: event.key === 'Enter', space: event.key === ' ' });
}
