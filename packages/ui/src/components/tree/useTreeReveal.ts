import { useEffect, useEffectEvent } from 'react';

import type { TreeLine } from './tree-line.js';
import type { TreeFocus } from './useTreeFocus.js';

type Reveal = {
    focus: TreeFocus;
    lines: readonly TreeLine[];
    onRevealed: (() => void) | undefined;
    revealed: string | null | undefined;
    scrollTo: (index: number) => void;
};

/**
 * The line asked for may not be among the lines yet: its folders open on the same request, and
 * the owner hands the lines again. The tree waits for it there, and goes to it once.
 */
export function useTreeReveal({ focus, lines, onRevealed, revealed, scrollTo }: Reveal): void {
    const index =
        revealed === null || revealed === undefined
            ? -1
            : lines.findIndex((line) => line.id === revealed);

    // The handlers are new on every drawing; what decides is which line and where it stands.
    const goTo = useEffectEvent((id: string, at: number): void => {
        scrollTo(at);
        focus.claim(id);
        onRevealed?.();
    });

    useEffect(() => {
        if (revealed === null || revealed === undefined || index < 0) {
            return;
        }

        goTo(revealed, index);
    }, [revealed, index]);
}
