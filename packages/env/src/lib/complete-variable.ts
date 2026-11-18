import { insertPlainText, rangeOfOffsets } from '@mandor/ui';

const OPENING = /\{\{/g;

/**
 * Closes the variable being written at the tail of the field with the name picked: the open
 * braces and everything after them are replaced by the closed token, and the caret is left
 * right after it. The edit happens in the DOM, so it composes with the caret the field
 * already holds instead of repainting it from outside. `end` cuts the question at the caret,
 * for fields that drew the closing braces in advance.
 */
export function completeVariable(node: HTMLElement, name: string, end?: number): void {
    const text = node.textContent;
    let stop = end ?? text.length;

    // The close the field drew in advance belongs to the token being completed: absorb it,
    // or completing would leave a second pair of braces behind the caret.
    if (text.slice(stop, stop + 2) === '}}') {
        stop += 2;
    }

    let start = -1;

    for (const match of text.matchAll(OPENING)) {
        if (match.index + 2 <= stop && text[match.index - 1] !== '\\') {
            start = match.index;
        }
    }

    if (start === -1) {
        return;
    }

    const selection = document.getSelection();

    selection?.removeAllRanges();
    selection?.addRange(rangeOfOffsets(node, start, stop));
    insertPlainText(node, `{{${name}}}`);
}
