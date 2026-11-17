import { useEffect, type RefObject } from 'react';

import { listenForTextZoom } from '../lib/text-zoom-input.js';

/**
 * Lets the reader resize the text of the window from the element a ref points at: the wheel with
 * the zoom key held, and the zoom key with the zero to bring it back.
 */
export function useTextZoomInput(ref: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const element = ref.current;

        if (element === null) {
            return undefined;
        }

        return listenForTextZoom(element);
    }, [ref]);
}
