import { placeCaretAt } from './caret-offset.js';

/**
 * The text a line had when the reader started on it, kept on the line itself, because whoever
 * decides what Escape means, a dialog around it, reads the key before the line does. It goes when
 * the line loses the focus: what was written by then stays written.
 */
export function holdText(line: HTMLElement): void {
    if (line.dataset['held'] !== undefined) {
        return;
    }

    line.dataset['held'] = line.textContent;
    line.addEventListener(
        'blur',
        () => {
            delete line.dataset['held'];
        },
        { once: true },
    );
}

/** Whether the element is a line holding a text other than the one it shows. */
export function hasEditToRestore(element: Element | null): boolean {
    const held = element?.getAttribute('data-held') ?? null;

    return held !== null && held !== element?.textContent;
}

/**
 * Puts back the text the line held, and tells its owner the way typing does; false when there is
 * nothing to put back.
 */
export function restoreHeldText(line: HTMLElement): boolean {
    const held = line.dataset['held'];

    if (held === undefined || !hasEditToRestore(line)) {
        return false;
    }

    line.textContent = held;
    line.dispatchEvent(new InputEvent('input', { bubbles: true }));
    placeCaretAt(line, held.length);

    return true;
}
