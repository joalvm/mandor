import type { RefObject } from 'react';

/** One node, two holders: the field keeps its own and hands the same span to the caller. */
export function withEditableRef(
    editable: RefObject<HTMLSpanElement | null>,
    handed: RefObject<HTMLSpanElement | null> | undefined,
): (node: HTMLSpanElement | null) => void {
    return (node: HTMLSpanElement | null): void => {
        editable.current = node;

        if (handed !== undefined) {
            handed.current = node;
        }
    };
}
