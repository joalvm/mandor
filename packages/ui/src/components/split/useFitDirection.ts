import { useEffect, useState, type RefObject } from 'react';

import type { SplitDirection } from './split-axis.js';

/** Below this width two halves side by side are too narrow to read: the second goes under. */
const SIDE_BY_SIDE = 640;

/** How the halves stand: always one way, or beside each other only while the pane has room. */
export type SplitLayout = SplitDirection | 'fit';

/**
 * The way the halves stand right now. A pane asked to fit is read off its own box, not the window:
 * it is a group the user splits and a panel the user drags, and it is followed while they do.
 * Until the box has been measured it counts as wide: that is what it nearly always is, and the
 * first frame is not the moment to flip it. A pane that stands one way measures nothing.
 */
export function useFitDirection(
    box: RefObject<HTMLElement | null>,
    layout: SplitLayout,
): SplitDirection {
    const [wide, setWide] = useState(true);
    const fits = layout === 'fit';

    useEffect(() => {
        const element = box.current;

        if (!fits || element === null) {
            return undefined;
        }

        const observer = new ResizeObserver(([entry]) => {
            if (entry !== undefined) {
                setWide(entry.contentRect.width >= SIDE_BY_SIDE);
            }
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [box, fits]);

    return directionOf(layout, wide);
}

function directionOf(layout: SplitLayout, wide: boolean): SplitDirection {
    if (layout !== 'fit') {
        return layout;
    }

    return wide ? 'row' : 'column';
}
