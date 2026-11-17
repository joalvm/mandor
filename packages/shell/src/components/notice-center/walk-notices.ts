import type { KeyboardEvent } from 'react';

/**
 * Up and down walk the rows of the list; the keyboard never needs the pointer to reach one. Delete
 * lets the row go and hands the focus to the one after it, or the one before at the end.
 */
export function walkNotices(event: KeyboardEvent<HTMLLIElement>, onDismiss: () => void): void {
    const row = event.currentTarget;
    const neighbour = new Map([
        ['ArrowDown', row.nextElementSibling],
        ['ArrowUp', row.previousElementSibling],
        ['Delete', row.nextElementSibling ?? row.previousElementSibling],
    ]).get(event.key);

    if (neighbour === undefined || event.target !== row) {
        return;
    }

    event.preventDefault();

    if (event.key === 'Delete') {
        onDismiss();
    }

    if (neighbour instanceof HTMLElement) {
        neighbour.focus();
    }
}
