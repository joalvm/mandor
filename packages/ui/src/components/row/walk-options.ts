import type { KeyboardEvent } from 'react';

/** Where each key sends the focus, by its place among the rows of the list. */
const STEPS = new Map<string, (index: number, last: number) => number>([
    ['ArrowDown', (index, last) => Math.min(index + 1, last)],
    ['ArrowUp', (index) => Math.max(index - 1, 0)],
    ['End', (_, last) => last],
    ['Home', () => 0],
]);

/**
 * Walks the focus along the rows and nothing else: selection and focus are two different
 * things, and a row opens only when it is taken.
 */
export function walkOptions(event: KeyboardEvent<HTMLElement>): void {
    const step = STEPS.get(event.key);
    const options = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')];
    const index = options.findIndex((option) => option === event.target);

    if (step === undefined || index === -1) {
        return;
    }

    event.preventDefault();
    options[step(index, options.length - 1)]?.focus();
}
