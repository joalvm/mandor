import { MARKDOWN_PREVIEW_EVENT } from '@mandor/ui';
import { useEffect, useEffectEvent, type RefObject } from 'react';

/**
 * Hears `Ctrl+K V` pressed in the editor inside the box. The editor knows nothing of the band
 * that holds the preview button, so the chord reaches it as an event that climbs out of the
 * editor, and whoever holds the box answers it.
 */
export function usePreviewChord(box: RefObject<HTMLElement | null>, onChord: () => void): void {
    const chord = useEffectEvent(onChord);

    useEffect(() => {
        const element = box.current;

        if (element === null) {
            return undefined;
        }

        function heard(): void {
            chord();
        }

        element.addEventListener(MARKDOWN_PREVIEW_EVENT, heard);

        return () => {
            element.removeEventListener(MARKDOWN_PREVIEW_EVENT, heard);
        };
    }, [box]);
}
