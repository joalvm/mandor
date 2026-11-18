import { useEffect, type RefObject } from 'react';

/** The element dockview draws around a tab, which holds the focus and scrolls along the strip. */
function wrapperOf(pill: RefObject<HTMLSpanElement | null>): Element | null {
    return pill.current?.closest('.dv-tab') ?? null;
}

/**
 * Shift+F10 and the menu key fire on the element that holds the focus, and dockview gives it to
 * the wrapper it draws around the tab, not to the pill inside. The wrapper hands the request on
 * to the pill, under its lower left corner, where a menu opened from the keyboard belongs.
 */
function useMenuFromKeys(pill: RefObject<HTMLSpanElement | null>): void {
    useEffect(() => {
        const wrapper = wrapperOf(pill);

        if (wrapper === null) {
            return undefined;
        }

        function handOn(event: Event): void {
            const target = pill.current;

            if (event.target !== wrapper || target === null) {
                return;
            }

            const corner = target.getBoundingClientRect();

            event.preventDefault();
            target.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    clientX: corner.left,
                    clientY: corner.bottom,
                }),
            );
        }

        wrapper.addEventListener('contextmenu', handOn);

        return () => {
            wrapper.removeEventListener('contextmenu', handOn);
        };
    }, [pill]);
}

/**
 * What a tab asks of the wrapper dockview draws around it: the menu asked for from the keys, and
 * coming into view when it is put in front, however far along the strip it was.
 */
export function useTabWrapper(pill: RefObject<HTMLSpanElement | null>, active: boolean): void {
    useMenuFromKeys(pill);

    useEffect(() => {
        if (active) {
            wrapperOf(pill)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [active, pill]);
}
