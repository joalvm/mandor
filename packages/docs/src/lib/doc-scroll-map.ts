/** A block of the rendered page and the line of markdown it was written from. */
export type DocAnchor = { line: number; top: number };

/**
 * Where the page has to stand for a line of the source to be at the top of it. Between two
 * anchors the answer is read straight across: a paragraph of ten lines is ten even steps down
 * its own height, which is near enough that a long document lands on the right screen.
 */
export function topForLine(anchors: readonly DocAnchor[], line: number): number {
    const at = indexBefore(anchors, (anchor) => anchor.line <= line);
    const from = anchors[at];
    const to = anchors[at + 1];

    if (from === undefined) {
        return 0;
    }

    if (to === undefined || to.line === from.line) {
        return from.top;
    }

    return from.top + ((line - from.line) / (to.line - from.line)) * (to.top - from.top);
}

/** The line of the source that sits at the top of the page, which is the other way round. */
export function lineForTop(anchors: readonly DocAnchor[], top: number): number {
    const at = indexBefore(anchors, (anchor) => anchor.top <= top);
    const from = anchors[at];
    const to = anchors[at + 1];

    if (from === undefined) {
        return 1;
    }

    if (to === undefined || to.top === from.top) {
        return from.line;
    }

    return Math.round(from.line + ((top - from.top) / (to.top - from.top)) * (to.line - from.line));
}

/** The last anchor that is still behind what was asked for, and the first one when none is. */
function indexBefore(
    anchors: readonly DocAnchor[],
    behind: (anchor: DocAnchor) => boolean,
): number {
    let at = 0;

    anchors.forEach((anchor, index) => {
        if (behind(anchor)) {
            at = index;
        }
    });

    return at;
}
