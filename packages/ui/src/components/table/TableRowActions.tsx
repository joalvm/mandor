import { type PropsWithChildren, useRef } from 'react';

import { useCoverWidth } from './useCoverWidth.js';

type TableRowActionsProps = PropsWithChildren<{
    /**
     * When the actions show: under the pointer or the focus, as on a table of fields, or always,
     * as on a listing whose rows are things to act on.
     */
    reveal?: 'always' | 'hover';
}>;

/**
 * The actions of one row, laid over the end of it, on the color of the row so the text under
 * them gives way. They take no column: the cell under them ends where they begin while they
 * show, and a row at rest whose actions hide reads to its edge.
 */
export function TableRowActions({ children, reveal = 'hover' }: TableRowActionsProps) {
    const cell = useRef<HTMLTableCellElement>(null);

    useCoverWidth(cell, 'tr', '--table-row-actions-width');

    return (
        <td data-part="table-row-actions" data-reveal={reveal} ref={cell}>
            {children}
        </td>
    );
}
