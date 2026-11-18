import { useRef, type PointerEvent } from 'react';

type PointerDrag = {
    onLostPointerCapture: () => void;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
};

/**
 * The drag of a line that sits between two zones: the pointer is captured on press, `onDrag`
 * hears every move until the release with the box the line sits in, and a system that takes the
 * pointer away mid drag leaves the line where it was.
 */
export function usePointerDrag(
    onDrag: (event: PointerEvent<HTMLElement>, box: HTMLElement) => void,
): PointerDrag {
    const dragging = useRef(false);

    return {
        onLostPointerCapture: () => {
            dragging.current = false;
        },
        onPointerDown: (event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        onPointerMove: (event) => {
            const box = event.currentTarget.parentElement;

            if (dragging.current && box !== null) {
                onDrag(event, box);
            }
        },
        onPointerUp: (event) => {
            dragging.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
        },
    };
}
