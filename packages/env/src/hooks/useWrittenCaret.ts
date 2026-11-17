import { type KeyboardEvent, type PointerEvent, type RefObject, useRef, useState } from 'react';

/** The keys that move the caret without writing anything where it lands. */
const CARET_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'End', 'Home']);

export type WrittenCaret = {
    /** Where the last edit left the caret; null while nothing is being written. */
    at: number | null;
    /** The same offset for what reads it outside a render: the anchor of a list, a completion. */
    atRef: RefObject<number | null>;
    /** Nothing is being written any more: the name was settled, or the field was left. */
    forget: () => void;
    /** A key that only moves the caret ends the writing. */
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    /** A press on the field moves the caret; one bubbling up from a portal does not. */
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    /** An edit left the caret here. */
    write: (at: number | null) => void;
};

/**
 * The caret of a field as the writing left it, and only as the writing left it. A caret that a
 * click, an arrow or leaving the field put somewhere wrote nothing there, and what reads this —
 * the suggestions of a variable — must not answer a question nobody asked.
 */
export function useWrittenCaret(): WrittenCaret {
    const atRef = useRef<number | null>(null);
    const [at, setAt] = useState<number | null>(null);

    function write(next: number | null): void {
        atRef.current = next;
        setAt(next);
    }

    function forget(): void {
        write(null);
    }

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        if (CARET_KEYS.has(event.key)) {
            forget();
        }
    }

    function onPointerDown(event: PointerEvent<HTMLElement>): void {
        // Lists hang from portals, and React bubbles their presses through the tree of the
        // field: only a press inside the field in the DOM moves its caret.
        if (event.currentTarget.contains(event.target as Node)) {
            forget();
        }
    }

    return { at, atRef, forget, onKeyDown, onPointerDown, write };
}
