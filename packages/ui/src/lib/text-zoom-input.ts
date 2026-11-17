import { setTextZoom, zoomTextBy } from './text-zoom.js';

/** The zoom key held alone: the control key, or the command key of a Mac. */
function zooming(event: KeyboardEvent | WheelEvent): boolean {
    return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}

/** The key of the zero, read by where it sits: on some layouts the zero is typed with a shift. */
function isZero(event: KeyboardEvent): boolean {
    return event.code === 'Digit0' || event.code === 'Numpad0';
}

/** Whether a key pressed in the window is meant for the element: typed inside it, or over it. */
function aimedAt(element: HTMLElement, event: KeyboardEvent): boolean {
    return (
        (event.target instanceof Node && element.contains(event.target)) ||
        element.matches(':hover')
    );
}

/**
 * Lets the reader resize the text read under an element. The wheel turned with the zoom key held
 * moves it a step for each notch, larger away from the reader, and the zoom key with the zero
 * brings it back to the size of the app. Both are heard before anything inside the element: the
 * editor under the pointer does not scroll, and the window does not zoom the whole interface.
 *
 * The keys are heard on the whole document, because a page being read holds no focus: they reach
 * the element when what has the focus is inside it or when the pointer rests over it.
 */
export function listenForTextZoom(element: HTMLElement): () => void {
    const onWheel = (event: WheelEvent): void => {
        if (!zooming(event) || event.deltaY === 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        zoomTextBy(event.deltaY < 0 ? 1 : -1);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        if (!zooming(event) || !isZero(event) || !aimedAt(element, event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setTextZoom(0);
    };

    element.addEventListener('wheel', onWheel, { capture: true, passive: false });
    element.ownerDocument.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
        element.removeEventListener('wheel', onWheel, { capture: true });
        element.ownerDocument.removeEventListener('keydown', onKeyDown, { capture: true });
    };
}
