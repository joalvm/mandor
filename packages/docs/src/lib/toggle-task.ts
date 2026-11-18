/** A task of a list, in a quote or not: the bullet or number, the box and what is in it. */
const TASK = /^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\](?=\s|$))/;

const FENCE = /^\s*(?:>\s*)*(?:```|~~~)/;

/** What a box holds once it is pressed. */
const TICKED: Readonly<Record<string, string>> = { ' ': 'x', X: ' ', x: ' ' };

/**
 * The text with its task number `index` ticked if it was not, and unticked if it was. Tasks are
 * counted in the order the page draws them, and the lines of a fenced block are code and hold
 * none. The page is not where a doc lives: ticking a box writes the text, and the text is what
 * goes to disk.
 */
export function toggledTask(text: string, index: number): string {
    const state = { fenced: false, seen: 0 };

    return text
        .split('\n')
        .map((line) => {
            if (FENCE.test(line)) {
                state.fenced = !state.fenced;
            }

            if (state.fenced || !TASK.test(line)) {
                return line;
            }

            state.seen += 1;

            if (state.seen - 1 !== index) {
                return line;
            }

            return line.replace(
                TASK,
                (_match, before: string, box: string, after: string) =>
                    `${before}${TICKED[box] ?? box}${after}`,
            );
        })
        .join('\n');
}
