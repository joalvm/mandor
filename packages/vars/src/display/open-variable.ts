const OPENING = /\{\{/g;

/** The characters that close the question: the token ends, another one starts, or a line does. */
const NOT_A_NAME = /[{}\n]/;

/**
 * The name being written after the last `{{` still open, or null when no opening waits for
 * one. The closing braces, a second opening or a line break all end the question: what the
 * field holds then is text the scanner reads, not a name the interface suggests for.
 *
 * The question ends at `end` — the caret, when the caller knows it. A token the field closed
 * in advance still asks for a name while the caret stands inside it.
 */
export function openVariable(template: string, end: number = template.length): string | null {
    let start = -1;

    for (const match of template.matchAll(OPENING)) {
        if (match.index + 2 <= end && template[match.index - 1] !== '\\') {
            start = match.index;
        }
    }

    if (start === -1) {
        return null;
    }

    const query = template.slice(start + 2, end);

    if (NOT_A_NAME.test(query)) {
        return null;
    }

    return query;
}
