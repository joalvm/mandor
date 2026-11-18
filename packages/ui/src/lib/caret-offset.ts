/**
 * Reads the caret as a character offset within the node, or null when the caret lives
 * somewhere else or holds a selection: an offset is where the caret stands, not a span.
 */
export function caretOffsetIn(node: HTMLElement): number | null {
    const selection = document.getSelection();

    if (selection === null || selection.rangeCount === 0) {
        return null;
    }

    const range = selection.getRangeAt(0);

    if (!range.collapsed || !node.contains(range.startContainer)) {
        return null;
    }

    const before = range.cloneRange();

    before.selectNodeContents(node);
    before.setEnd(range.startContainer, range.startOffset);

    return before.toString().length;
}

/** A range over the character offsets of the node, wherever the text nodes fell. */
export function rangeOfOffsets(node: HTMLElement, start: number, end: number): Range {
    const range = document.createRange();
    const from = pointAt(node, start);
    const to = pointAt(node, end);

    if (from === null) {
        range.selectNodeContents(node);
        range.collapse(false);

        return range;
    }

    range.setStart(from.container, from.inset);

    if (to === null) {
        range.setEnd(node, node.childNodes.length);

        return range;
    }

    range.setEnd(to.container, to.inset);

    return range;
}

/** The rect of the spot an offset stands in. A platform that cannot measure ranges answers an empty rect. */
export function caretRectAt(node: HTMLElement, offset: number): DOMRect {
    const range = rangeOfOffsets(node, offset, offset);

    return typeof range.getBoundingClientRect === 'function'
        ? range.getBoundingClientRect()
        : new DOMRect();
}

/**
 * Puts the caret back at the character offset it had, walking the text nodes the paint
 * left behind. An offset past the end lands at the end: the text shrank under the caret.
 */
export function placeCaretAt(node: HTMLElement, offset: number): void {
    const selection = document.getSelection();

    selection?.removeAllRanges();
    selection?.addRange(rangeOfOffsets(node, offset, offset));
}

/** The text node holding an offset and how deep it sits in it, or null when past the end. */
function pointAt(node: HTMLElement, offset: number): { container: Node; inset: number } | null {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let walked = 0;
    let current = walker.nextNode();

    while (current !== null && walked + (current.textContent ?? '').length < offset) {
        walked += (current.textContent ?? '').length;
        current = walker.nextNode();
    }

    if (current === null) {
        return null;
    }

    return { container: current, inset: offset - walked };
}
