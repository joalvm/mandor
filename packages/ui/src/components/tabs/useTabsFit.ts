import { useLayoutEffect, useState, type RefObject } from 'react';

import { outOfView, scrollShowing } from './tabs-fit.js';

const NONE: readonly HTMLElement[] = [];

function sameTriggers(one: readonly HTMLElement[], other: readonly HTMLElement[]): boolean {
    return one.length === other.length && one.every((each, index) => each === other[index]);
}

/** Scrolls the list so the open section is whole, and answers the sections left out of view. */
function fitList(list: HTMLDivElement, open: string): HTMLElement[] {
    const triggers = [...list.querySelectorAll<HTMLElement>('[data-part="tabs-trigger"]')];
    const spans = triggers.map((each) => ({ start: each.offsetLeft, width: each.offsetWidth }));
    const shown = triggers.findIndex((each) => each.dataset['value'] === open);
    const room = list.clientWidth;
    const scroll = scrollShowing(spans, shown, list.scrollLeft, room);

    list.scrollLeft = scroll;

    const hidden = outOfView(spans, scroll, room).flatMap((index) => triggers[index] ?? []);

    for (const trigger of triggers) {
        trigger.toggleAttribute('data-out-of-view', hidden.includes(trigger));
    }

    return hidden;
}

/**
 * The sections of a list that do not fit in it. The list keeps every section where it is, and
 * scrolls so the open one is always whole; what is not whole is not drawn, because a name cut at
 * the edge reads as another name, and it is what the strip offers in its menu. Measured again whenever the list or a section
 * changes width, a section is added or removed, or another one opens.
 *
 * A window without `ResizeObserver` measures nothing and hides nothing.
 */
export function useTabsFit(
    list: RefObject<HTMLDivElement | null>,
    open: string,
    sections: number,
): readonly HTMLElement[] {
    const [hidden, setHidden] = useState<readonly HTMLElement[]>(NONE);

    useLayoutEffect(() => {
        const element = list.current;

        if (element === null || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        function measure(): void {
            if (element === null) {
                return;
            }

            const left = fitList(element, open);

            setHidden((before) => (sameTriggers(before, left) ? before : left));
        }

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        for (const child of element.children) {
            observer.observe(child);
        }

        measure();

        return () => {
            observer.disconnect();
        };
    }, [list, open, sections]);

    return hidden;
}
