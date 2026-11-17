import { type PropsWithChildren, useRef } from 'react';

import { useCoverWidth } from './useCoverWidth.js';

type TableToolsProps = PropsWithChildren<{
    /** The name of the column the actions of the rows stand in, for a screen reader. */
    label: string;
}>;

/**
 * The last cell of the head: the ways to work the whole table — copy it, write it as text, take
 * a preset — laid over the end of the head instead of in a column of its own. It also names,
 * for a screen reader, the actions each row lays over its own end.
 */
export function TableTools({ children, label }: TableToolsProps) {
    const cell = useRef<HTMLTableCellElement>(null);

    useCoverWidth(cell, 'table', '--table-tools-width');

    return (
        <th data-part="table-tools" ref={cell} scope="col">
            <span className="sr-only">{label}</span>
            {children}
        </th>
    );
}
