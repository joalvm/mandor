import { type PropsWithChildren, useRef } from 'react';

import { useCoverWidth } from './useCoverWidth.js';

/**
 * The actions of one row, laid over the end of it while the pointer or the focus is on the
 * row, on the color of the row so the text under them gives way. They take no column: a row at
 * rest reads to its edge, and the cell being written ends where they begin.
 */
export function TableRowActions({ children }: PropsWithChildren) {
    const cell = useRef<HTMLTableCellElement>(null);

    useCoverWidth(cell, 'tr', '--table-row-actions-width');

    return (
        <td data-part="table-row-actions" ref={cell}>
            {children}
        </td>
    );
}
