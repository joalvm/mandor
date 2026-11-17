import { createContext, useContext } from 'react';

import type { TableColumn, TableDrag } from './table-columns.js';

/** What a table shares with the cells of its head: its columns, and the way an edge moves. */
export type TableContextValue = {
    columns: readonly TableColumn[];
    /** Moves the right edge of a column by the pixels of a drag. */
    resize: (drag: TableDrag) => void;
};

export const TableContext = createContext<TableContextValue | undefined>(undefined);

/** The table a cell of the head belongs to. A head cell outside a table is a wiring mistake. */
export function useTableContext(): TableContextValue {
    const table = useContext(TableContext);

    if (table === undefined) {
        throw new Error('TableHeaderCell outside Table');
    }

    return table;
}
