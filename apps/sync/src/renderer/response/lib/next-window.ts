import type { EditorView } from '@mandor/ui';

/**
 * Whether the reader of a body read by windows is near the end of what is in, so the next window
 * is asked for. A text that fits the view asks at once; one that overflows asks when the view is
 * within a screen of its end on both axes. A small overflow across must not read ahead while the
 * end is still far below, or the reverse. Counting lines asked for every window of a body of one
 * long line, which never has more than a screenful of them, until all of it was read.
 */
export function wantsNextWindow(view: EditorView | undefined): boolean {
    // A view with no size, or none at all, is not on screen: nobody reads there.
    if (view === undefined || view.height === 0 || view.width === 0) {
        return false;
    }

    const below = view.scrollHeight - view.scrollTop - view.height;
    const across = view.scrollWidth - view.scrollLeft - view.width;

    return below <= view.height && across <= view.width;
}
