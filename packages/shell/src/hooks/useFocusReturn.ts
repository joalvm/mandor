import { useEffect } from 'react';

/**
 * Moves the focus onto an element while it is active and hands it back when it stops being so:
 * when it goes, or the moment it says it is no longer active although it is still drawn, as the
 * palette does while it fades out.
 *
 * Whoever opened the palette was reading something; closing it puts them back there instead of at
 * the top of the window with the cursor lost.
 */
export function useFocusReturn(id: string, active = true): void {
    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const origin = document.activeElement;

        document.getElementById(id)?.focus();

        return () => {
            if (origin instanceof HTMLElement) {
                origin.focus();
            }
        };
    }, [id, active]);
}
