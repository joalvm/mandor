import { type RefObject, useLayoutEffect } from 'react';

/** Where a cover writes its width: on its table, for every row, or on its own row. */
export type CoverHolder = 'table' | 'tr';

/** The width to the fraction of a pixel: rounded, what ends where the cover begins slips under. */
function writeWidth(holder: HTMLElement, property: string, cover: HTMLElement): void {
    holder.style.setProperty(property, `${String(cover.getBoundingClientRect().width)}px`);
}

/**
 * How wide a cell laid over the end of its row stands — the tools of the head, the actions of a
 * row — written as a property on the element that lays out what it covers, so the cell under
 * it ends where the cover begins. A window without `ResizeObserver` measures nothing.
 */
export function useCoverWidth(
    cover: RefObject<HTMLTableCellElement | null>,
    holder: CoverHolder,
    property: string,
): void {
    useLayoutEffect(() => {
        const cell = cover.current;
        const target = cell?.closest<HTMLElement>(holder) ?? null;

        if (cell === null || target === null || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            writeWidth(target, property, cell);
        });

        observer.observe(cell);
        writeWidth(target, property, cell);

        return () => {
            observer.disconnect();
            target.style.removeProperty(property);
        };
    }, [cover, holder, property]);
}
