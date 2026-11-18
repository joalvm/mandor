import type { ReactNode } from 'react';

import { KeyValuePresetsDialog } from './KeyValuePresetsDialog.js';
import { PlainKeyValueTable } from './PlainKeyValueTable.js';
import type { KeyValueTableOptions } from './useKeyValueTableState.js';

/**
 * The table of pairs: query and header params, the fields of a body, the entries of an
 * environment - anywhere the answer is many lines of key, value and whether it goes out.
 *
 * One anatomy serves them all, and the extras are data, never another table: names to
 * suggest while a key is written, rows the app adds by itself, a book of named groups to
 * take in whole. A table given none of them is the plain one — the same rows born from the
 * empty last row, walked with the tabulator, carried by the handle, said in one bulk text.
 */
export function KeyValueTable(props: KeyValueTableOptions & { title: string }): ReactNode {
    return (
        <PlainKeyValueTable {...props}>
            <KeyValuePresetsDialog />
        </PlainKeyValueTable>
    );
}
