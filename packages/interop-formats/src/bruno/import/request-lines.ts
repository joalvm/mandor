import type { RequestLine } from '@mandor/schema';

import type { BrunoRow } from '../document/bruno-tree.js';

/** The rows of a table as the lines of a request; a switched-off row stays, switched off. */
export function linesOf(rows: readonly BrunoRow[]): RequestLine[] {
    return rows.map((row) => ({ key: row.name, value: row.value, enabled: !row.disabled }));
}
