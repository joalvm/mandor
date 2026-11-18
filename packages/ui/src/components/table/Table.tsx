import { type PropsWithChildren, useRef } from 'react';

import type { TableColumn } from './table-columns.js';
import { TableContext } from './table-context.js';
import { useTableColumns } from './useTableColumns.js';

type TableProps = PropsWithChildren<{
    columns: readonly TableColumn[];
    /** What the table is a table of: the name a screen reader announces it by. */
    label: string;
    /**
     * Whether a row lifts under the pointer. A table of fields says no: each field answers the
     * pointer on its own, and a tint behind them only muddies the white they are written on.
     */
    rowHover?: boolean | undefined;
}>;

/**
 * The one table of the window, for the rows a person reads and for the ones they write. The
 * head and every row lay their cells on one grid the table writes from its columns, so a
 * column is as wide in the head as in the last row, whatever a cell holds, and its edge can be
 * dragged without the rest of the table moving. Inside it go the `TableHead` and a `tbody` of
 * plain rows; the tools of the head and the actions of a row are laid over the end of their row,
 * so no column stands empty waiting for them. The look lives in `table.css`.
 */
export function Table({ children, columns, label, rowHover = true }: TableProps) {
    const root = useRef<HTMLTableElement>(null);
    const context = useTableColumns(columns, root);

    return (
        <TableContext.Provider value={context}>
            <table
                aria-label={label}
                className="font-ui text-sm text-text-primary"
                data-part="table"
                data-row-hover={rowHover ? undefined : 'off'}
                ref={root}
            >
                {children}
            </table>
        </TableContext.Provider>
    );
}
