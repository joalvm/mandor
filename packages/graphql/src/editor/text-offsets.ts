/** A place in a text the way the language service counts it: line and character, both from zero. */
export type TextPosition = { character: number; line: number };

/** Says the line and character an offset is on; an offset out of the text lands on its edge. */
export function positionOf(text: string, offset: number): TextPosition {
    const head = text.slice(0, Math.max(0, Math.min(offset, text.length)));
    const start = head.lastIndexOf('\n') + 1;

    return { character: head.length - start, line: head.split('\n').length - 1 };
}

/** Where the line after `start` begins, or `null` when the text ends first. */
function nextLineStart(text: string, start: number): number | null {
    const end = text.indexOf('\n', start);

    return end === -1 ? null : end + 1;
}

/** The inverse of {@link positionOf}; a character past its line stays on the line. */
export function offsetOf(text: string, { character, line }: TextPosition): number {
    let start = 0;

    for (let row = 0; row < line; row++) {
        const next = nextLineStart(text, start);

        if (next === null) {
            return text.length;
        }

        start = next;
    }

    const end = nextLineStart(text, start);

    return Math.min(start + Math.max(0, character), end === null ? text.length : end - 1);
}
