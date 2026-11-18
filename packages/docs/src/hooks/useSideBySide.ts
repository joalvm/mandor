import { useEffect, useState, type RefObject } from 'react';

/** Below this width two columns of text do not fit: the page goes under the markdown instead. */
const SIDE_BY_SIDE = 640;

/**
 * Whether the box is wide enough for the markdown and its page side by side. It is read off the
 * box and not the window, because the box is a panel the reader drags, and it is followed while
 * they drag it. Until the box has been measured it counts as wide: that is what it nearly always
 * is, and the first frame is not the moment to flip it.
 */
export function useSideBySide(box: RefObject<HTMLElement | null>): boolean {
    const [wide, setWide] = useState(true);

    useEffect(() => {
        const element = box.current;

        if (element === null) {
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
    }, [box]);

    return wide;
}
