import type { PointerEvent } from 'react';

/**
 * Keeps a line of a closing menu from answering the pointer. The menu fades out after a line is
 * chosen, and while it fades the pointer still crosses its lines: one it enters takes the focus,
 * one it leaves hands the focus to the menu, and either takes it from the field the chosen line
 * just opened — the name Rename gives way to — which ends that field before anyone typed in it.
 * Marking the event handled is how the line is told to let it pass.
 */
export function ignoredWhileClosing(event: PointerEvent<HTMLElement>): void {
    if (event.currentTarget.closest("[role='menu'][data-state='closed']") !== null) {
        event.preventDefault();
    }
}
