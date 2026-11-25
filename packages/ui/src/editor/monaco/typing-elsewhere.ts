/**
 * Whether someone is writing in a field outside the editor — the name of a row being renamed —
 * so an editor that mounts late does not take the focus from it.
 */
export function typingElsewhere(element: HTMLElement): boolean {
    const held = document.activeElement;

    return (
        held instanceof HTMLElement &&
        !element.contains(held) &&
        held.closest('input, textarea, [contenteditable]:not([contenteditable="false"])') !== null
    );
}
