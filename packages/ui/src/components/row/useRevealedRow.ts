import { useEffect, useEffectEvent, type RefObject } from 'react';

/** A row asked to show scrolls into view and takes the focus, once per request, and says so. */
export function useRevealedRow(
    row: RefObject<HTMLDivElement | null>,
    revealed: boolean,
    onRevealed: (() => void) | undefined,
): void {
    // The handler is new on every drawing; what decides is the request.
    const told = useEffectEvent((): void => {
        onRevealed?.();
    });

    useEffect(() => {
        const element = row.current;

        if (!revealed || element === null) {
            return;
        }

        element.scrollIntoView({ block: 'nearest' });
        element.focus();
        told();
    }, [row, revealed]);
}
