import { type RefObject, useLayoutEffect } from 'react';

const TOAST = "[data-part='toast']";

/**
 * The height a notice stands at laid out whole, edge included, even while the stack clips its
 * box to the height of the front one: the content it holds still asks for all of it.
 */
function naturalHeight(toast: HTMLElement): number {
    return toast.scrollHeight + toast.offsetHeight - toast.clientHeight;
}

function withGaps(pixels: number, gaps: number): string {
    return `calc(${String(pixels)}px + ${String(gaps)} * var(--mandor-gap-control))`;
}

/** Writes how far each notice rides up when the stack opens, and how tall the stack stands. */
function writeStack(viewport: HTMLElement): void {
    const newestFirst = [...viewport.querySelectorAll<HTMLElement>(TOAST)].reverse();
    let below = 0;

    for (const [index, toast] of newestFirst.entries()) {
        toast.style.setProperty('--toast-offset', withGaps(below, index));
        below += naturalHeight(toast);
    }

    const front = newestFirst[0];
    const gaps = Math.max(0, newestFirst.length - 1);

    viewport.style.setProperty(
        '--toast-front-height',
        `${String(front === undefined ? 0 : naturalHeight(front))}px`,
    );
    viewport.style.setProperty('--toast-stack-height', withGaps(below, gaps));
}

/**
 * Lays the notices of a corner out as a stack the window can draw: `runtime.css` piles them on
 * the front one and opens them into a list, and both need heights only the window knows. They
 * are measured again whenever a notice changes size. A window without `ResizeObserver` measures
 * once per change of the notices on screen.
 */
export function useToastStack(viewport: RefObject<HTMLOListElement | null>, shown: string): void {
    useLayoutEffect(() => {
        const list = viewport.current;

        if (list === null) {
            return undefined;
        }

        writeStack(list);

        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            writeStack(list);
        });

        for (const toast of list.querySelectorAll(TOAST)) {
            observer.observe(toast);
        }

        return () => {
            observer.disconnect();
        };
    }, [viewport, shown]);
}
