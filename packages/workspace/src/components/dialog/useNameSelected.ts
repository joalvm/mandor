import { type RefObject, useEffect } from 'react';

function selectAllOf(field: HTMLElement): void {
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(field);
    selection?.removeAllRanges();
    selection?.addRange(range);
}

/**
 * Selects the whole name the first time the field takes the focus, so a name the dialog proposes
 * is replaced by the first key typed. The dialog puts the focus there itself, sooner or later than
 * this runs: a field that already holds it is selected at once.
 */
export function useNameSelected(fieldRef: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        function onFocusIn(event: FocusEvent): void {
            if (fieldRef.current !== null && event.target === fieldRef.current) {
                selectAllOf(fieldRef.current);
                document.removeEventListener('focusin', onFocusIn);
            }
        }

        if (fieldRef.current !== null && document.activeElement === fieldRef.current) {
            selectAllOf(fieldRef.current);

            return undefined;
        }

        document.addEventListener('focusin', onFocusIn);

        return () => {
            document.removeEventListener('focusin', onFocusIn);
        };
    }, [fieldRef]);
}
