import { useEffect } from 'react';

/**
 * Moves the focus onto an element while it is drawn and hands it back when it goes.
 *
 * Whoever opened the palette was reading something; closing it puts them back there instead of at
 * the top of the window with the cursor lost.
 */
export function useFocusReturn(id: string): void {
    useEffect(() => {
        const origin = document.activeElement;

        document.getElementById(id)?.focus();

        return () => {
            if (origin instanceof HTMLElement) {
                origin.focus();
            }
        };
    }, [id]);
}
