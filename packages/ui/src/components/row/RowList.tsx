import type { ComponentProps } from 'react';

import { InRowListProvider } from './in-row-list.js';
import { useRowListFocus } from './useRowListFocus.js';

type RowListProps = Omit<ComponentProps<'div'>, 'aria-label' | 'onFocus' | 'onKeyDown' | 'role'> & {
    /** How many rows the whole list has, when only part of them is in the DOM. */
    count?: number | undefined;
    label: string;
    /** Brings a row that is not drawn into the DOM, so Home and End reach the ends of a long list. */
    scrollTo?: ((index: number) => void) | undefined;
};

/**
 * A list the tabulator stops at once, whatever its length: the arrows, Home and End walk its rows,
 * and only Enter or space takes one, so selection and focus stay two things. Tab comes back to the
 * row it left, or to the one taken.
 */
export function RowList({ children, count, label, scrollTo, ...box }: RowListProps) {
    const { list, onFocus, onKeyDown } = useRowListFocus({ count, scrollTo });

    return (
        <div
            data-part="row-list"
            {...box}
            aria-label={label}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            ref={list}
            role="listbox"
        >
            <InRowListProvider value>{children}</InRowListProvider>
        </div>
    );
}
