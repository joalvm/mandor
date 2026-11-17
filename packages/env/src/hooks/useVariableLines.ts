import type { Variable } from '@mandor/schema';
import { useState } from 'react';

import { linesOfVariables, variablesOfLines } from '../components/key-value/environment-lines.js';
import type { KeyValueLine } from '../components/key-value/key-value-line.js';

/**
 * A list of variables as the lines of the shared table. The identity of each line is the one
 * the table handed back with it, so a row born from the empty one keeps the id the table gave
 * it — and the focus the table sent after it — and a row that is dragged or removed takes its
 * own id along instead of leaving it to the row that slides into its place.
 */
export function useVariableLines(variables: readonly Variable[]) {
    const [ids, setIds] = useState<readonly string[]>([]);

    return {
        /** Takes the lines the table hands back: keeps their ids and answers their variables. */
        adopt: (lines: readonly KeyValueLine[]): Variable[] => {
            setIds(lines.map((line) => line.id));

            return variablesOfLines(lines);
        },
        lines: linesOfVariables(variables, ids),
    };
}
