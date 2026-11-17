import type { PropsWithChildren } from 'react';

/**
 * A cell of a fixed column in a row: the handle that carries the row, the box that ticks it.
 * It holds its control in the middle, with no air of its own and no line beside it.
 */
export function TableLeadCell({ children }: PropsWithChildren) {
    return (
        <td data-lead="" data-part="table-lead-cell">
            {children}
        </td>
    );
}
