import { type RefObject, useLayoutEffect, useState } from 'react';

import {
    resizedWeights,
    tableTemplateOf,
    type TableColumn,
    type TableWeights,
} from './table-columns.js';
import type { TableContextValue } from './table-context.js';

const STARTING_WEIGHTS: TableWeights = {};

/**
 * The columns of a table and the weights its edges were dragged to. It writes the tracks where
 * the stylesheet reads them, on the table itself, so the head and every row lay out on the same
 * grid; a drag lives as long as the table stands.
 */
export function useTableColumns(
    columns: readonly TableColumn[],
    root: RefObject<HTMLTableElement | null>,
): TableContextValue {
    const [weights, setWeights] = useState<TableWeights>(STARTING_WEIGHTS);
    const template = tableTemplateOf(columns, weights);

    useLayoutEffect(() => {
        root.current?.style.setProperty('--table-columns', template);
    }, [root, template]);

    return {
        columns,
        resize: (drag) => {
            setWeights((current) => resizedWeights(columns, current, drag));
        },
    };
}
