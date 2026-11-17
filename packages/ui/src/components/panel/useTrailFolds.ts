import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

type Folds = { folded: boolean; trail: string };

/** How much of its text each stretch of the list cuts off to fit. */
function cutShort(list: HTMLElement): number {
    const stretches = list.querySelectorAll<HTMLElement>('[data-part="breadcrumbs-stretch"]');
    let cut = 0;

    for (const stretch of stretches) {
        cut += Math.max(0, stretch.scrollWidth - stretch.clientWidth);
    }

    return cut;
}

/**
 * Whether a trail folds its middle away. It folds once a stretch, written whole, no longer fits
 * in the room the list has; it unfolds once that room grows back to the width the whole trail
 * needed, so a trail right at the edge does not flicker between the two. A new trail starts
 * whole and is measured again.
 *
 * A window without `ResizeObserver` measures nothing and folds nothing.
 */
export function useTrailFolds(list: RefObject<HTMLOListElement | null>, trail: string): boolean {
    const [folds, setFolds] = useState<Folds>({ folded: false, trail });
    const whole = useRef(0);
    const folded = folds.trail === trail && folds.folded;

    useLayoutEffect(() => {
        const element = list.current;

        if (element === null || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        function measure(): void {
            if (element === null) {
                return;
            }

            if (folded) {
                if (element.clientWidth >= whole.current) {
                    setFolds({ folded: false, trail });
                }

                return;
            }

            const cut = cutShort(element);

            if (cut > 0) {
                whole.current = element.clientWidth + cut;
                setFolds({ folded: true, trail });
            }
        }

        const observer = new ResizeObserver(measure);

        observer.observe(element);
        measure();

        return () => {
            observer.disconnect();
        };
    }, [folded, list, trail]);

    return folded;
}
