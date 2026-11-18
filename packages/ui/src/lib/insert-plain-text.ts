/** Replaces the current contenteditable selection with plain text. */
export function insertPlainText(element: HTMLElement, text: string): void {
    const selection = window.getSelection();
    const range = selection?.rangeCount === 0 ? undefined : selection?.getRangeAt(0);

    if (range === undefined || !element.contains(range.commonAncestorContainer)) {
        element.append(document.createTextNode(text));

        return;
    }

    const node = document.createTextNode(text);

    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
}
