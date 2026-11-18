import type { KeyValueColumns, KeyValueLine } from '@mandor/env';
import { useState } from 'react';

import { linesOf, sameRecords, writtenOf, type EntryRecords } from '../lib/entry-lines.js';
import { repeatedNames } from '../lib/header-rows.js';

/** The columns a table of records opens with: a record keeps no description to show. */
const OPENING_COLUMNS: KeyValueColumns = { description: false, value: true };

/**
 * The lines of a table of pairs that stands for two records, each line on or off. The table
 * holds lines and the records are written from them: a record keeps no entry without a name and
 * no two under the same one, so while either is on screen the lines are the truth and the
 * records trail them. A line switched off travels to the off record — kept for the day it comes
 * back, never sent. A name two lines claim wears the error line where it happens.
 */
export function useRecordLines(current: EntryRecords, onWrite: (records: EntryRecords) => void) {
    const [columns, setColumns] = useState<KeyValueColumns>(OPENING_COLUMNS);
    const [editing, setEditing] = useState(() => ({ lines: linesOf(current), sent: current }));

    // The records moved and these lines are not what moved them: they were written elsewhere.
    if (!sameRecords(editing.sent, current)) {
        setEditing({ lines: linesOf(current), sent: current });
    }

    const repeated = repeatedNames(editing.lines);

    function onLinesChange(next: readonly KeyValueLine[]): void {
        const records = writtenOf(next);

        setEditing({ lines: [...next], sent: records });

        if (!sameRecords(records, current)) {
            onWrite(records);
        }
    }

    return {
        columns,
        keyInvalid: (line: KeyValueLine) => repeated.has(line.name),
        lines: editing.lines,
        onColumnsChange: setColumns,
        onLinesChange,
    };
}
