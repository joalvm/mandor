import { useEffect, useEffectEvent, useRef } from 'react';

import type { TreeLine } from './tree-line.js';

type Follow = {
    followed: string | null | undefined;
    lines: readonly TreeLine[];
    scrollTo: (index: number) => void;
};

/**
 * The line that stands for what the window shows is brought into sight once each time it becomes
 * the one followed, as soon as it is among the lines — its folders may open on the same change.
 * The focus stays where it was: following is not asking the user to look at the tree. Lines
 * opening and closing above it later move it without scrolling back to it, because by then the
 * scroll is the reader's.
 */
export function useTreeFollow({ followed, lines, scrollTo }: Follow): void {
    const shown = useRef<string | null>(null);
    const index =
        followed === null || followed === undefined
            ? -1
            : lines.findIndex((line) => line.id === followed);

    // The handler is new on every drawing; what decides is which line and where it stands.
    const goTo = useEffectEvent((at: number): void => {
        scrollTo(at);
    });

    useEffect(() => {
        if (followed === null || followed === undefined) {
            shown.current = null;

            return;
        }

        if (index < 0 || shown.current === followed) {
            return;
        }

        shown.current = followed;
        goTo(index);
    }, [followed, index]);
}
