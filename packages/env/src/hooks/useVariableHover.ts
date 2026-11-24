import type { PointerEvent } from 'react';

import { useHoverGrace, type HoverGrace } from './useHoverGrace.js';

/** What the hover reads of a move of the pointer: the element it came over or left. */
type PointerMove = Pick<PointerEvent<HTMLElement>, 'target'>;

/**
 * How long the pointer has to rest on a token before its panel comes up, the same wait every
 * tooltip of the window takes. A panel that opens on contact opens while the pointer is still
 * travelling, over whatever the reader was reaching for.
 */
const OPEN_DELAY_MS = 400;

export type VariableHover = HoverGrace & {
    onPointerOut: (event: PointerMove) => void;
    onPointerOver: (event: PointerMove) => void;
};

/**
 * Which variable token of a field the pointer is on, with the grace around it. The token is found
 * by the `data-variable` a painted token carries.
 */
export function useVariableHover(): VariableHover {
    const { controls, hover } = useHoverGrace();

    function show(found: HTMLElement, name: string): void {
        // The rect is read when the panel opens, never when the pointer arrived: the line
        // underneath goes on being typed into while the wait runs.
        controls.show({ name, rect: found.getBoundingClientRect() });
    }

    function onPointerOver(event: PointerMove): void {
        const found = (event.target as HTMLElement).closest<HTMLElement>('[data-variable]');

        if (found === null || controls.held()) {
            return;
        }

        const name = found.dataset['variable'];

        if (name === undefined) {
            return;
        }

        // A panel already up has paid the wait: reading along a line of tokens is one gesture,
        // and stopping to wait at each of them would read as the panel lagging behind.
        if (controls.showing()) {
            hover.cancel();
            show(found, name);

            return;
        }

        controls.after(OPEN_DELAY_MS, () => {
            show(found, name);
        });
    }

    function onPointerOut(event: PointerMove): void {
        if ((event.target as HTMLElement).closest('[data-variable]') !== null) {
            hover.schedule();
        }
    }

    return { ...hover, onPointerOut, onPointerOver };
}
