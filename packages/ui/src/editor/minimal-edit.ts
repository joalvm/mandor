/** One replacement, in offsets of the text it applies to. */
type MinimalEdit = { from: number; to: number; text: string };

const HIGH_SURROGATE_FIRST = 0xd800;
const HIGH_SURROGATE_LAST = 0xdbff;
const LOW_SURROGATE_FIRST = 0xdc00;
const LOW_SURROGATE_LAST = 0xdfff;

function isHighSurrogate(code: number): boolean {
    return code >= HIGH_SURROGATE_FIRST && code <= HIGH_SURROGATE_LAST;
}

function isLowSurrogate(code: number): boolean {
    return code >= LOW_SURROGATE_FIRST && code <= LOW_SURROGATE_LAST;
}

/**
 * Spans tried from widest to one character: the engine compares a span natively, several times
 * faster than a loop over characters, which took a third of a second for a body of 50 MB at each
 * window of it the editor was handed.
 */
const SPANS = [1 << 16, 1 << 12, 1 << 8, 1 << 4, 1];

function sharedHead(before: string, after: string): number {
    const limit = Math.min(before.length, after.length);
    let head = 0;

    for (const span of SPANS) {
        while (head + span <= limit && before.startsWith(after.slice(head, head + span), head)) {
            head += span;
        }
    }

    return isHighSurrogate(before.charCodeAt(head - 1)) ? head - 1 : head;
}

/** The tail stops where the head ends, so no character is counted as both. */
function sharedTail(before: string, after: string, head: number): number {
    const limit = Math.min(before.length, after.length) - head;
    let tail = 0;

    for (const span of SPANS) {
        while (
            tail + span <= limit &&
            before.endsWith(
                after.slice(after.length - tail - span, after.length - tail),
                before.length - tail,
            )
        ) {
            tail += span;
        }
    }

    return isLowSurrogate(before.charCodeAt(before.length - tail)) ? tail - 1 : tail;
}

/**
 * The one replacement that turns a text into another, leaving what both share at the ends where
 * it is. A text written over whole moves the caret to the end and folds every fold open; this
 * keeps the caret, the folds and the scroll of whoever is reading, and undo takes back only the
 * part that changed. An edge never falls inside a surrogate pair, which the editor would move.
 */
export function minimalEdit(before: string, after: string): MinimalEdit | null {
    if (before === after) {
        return null;
    }

    const head = sharedHead(before, after);
    const tail = sharedTail(before, after, head);

    return { from: head, text: after.slice(head, after.length - tail), to: before.length - tail };
}
