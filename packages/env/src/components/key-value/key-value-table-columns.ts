import type { TableColumn } from '@mandor/ui';

import { cellColumnsOf, type KeyValueCell, type KeyValueColumns } from './key-value-line.js';

/** The handle and the switch: as wide as the control each one holds, on every row. */
const HANDLE_COLUMN: TableColumn = { id: 'handle', kind: 'fixed', size: 'handle' };
const CHECK_COLUMN: TableColumn = { id: 'check', kind: 'fixed', size: 'check' };

/** The share each column of text starts with: the description reads longest, the value least. */
const CELL_COLUMNS: Readonly<Record<KeyValueCell, TableColumn>> = {
    description: { id: 'description', kind: 'fluid', min: 'md', weight: 1.2 },
    key: { id: 'key', kind: 'fluid', min: 'md', weight: 1.1 },
    value: { id: 'value', kind: 'fluid', min: 'md', weight: 1 },
};

/** The tracks of the table for the columns in force; a table with no switch has no track for it. */
export function tableColumnsOf(columns: KeyValueColumns, checkable = true): readonly TableColumn[] {
    return [
        HANDLE_COLUMN,
        ...(checkable ? [CHECK_COLUMN] : []),
        ...cellColumnsOf(columns).map((cell) => CELL_COLUMNS[cell]),
    ];
}
