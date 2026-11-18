/** Where a section of the strip starts and how wide it is, measured from the start of the list. */
export type TabSpan = { start: number; width: number };

/** Half a pixel either way: a section cut by less than that is drawn whole. */
const SLACK = 0.5;

/**
 * How far the list has to be scrolled for the open section to stand whole in view, moving as
 * little as it can: a section already in view leaves the list where it was.
 */
export function scrollShowing(
    spans: readonly TabSpan[],
    open: number,
    scroll: number,
    room: number,
): number {
    const span = spans[open];

    if (span === undefined || span.start < scroll) {
        return span?.start ?? scroll;
    }

    const end = span.start + span.width;

    return end > scroll + room ? end - room : scroll;
}

/** The sections that the list, scrolled this far and this wide, does not show whole. */
export function outOfView(spans: readonly TabSpan[], scroll: number, room: number): number[] {
    return spans.flatMap((span, index) =>
        span.start < scroll - SLACK || span.start + span.width > scroll + room + SLACK
            ? [index]
            : [],
    );
}
