import { type PointerEvent as ReactPointerEvent, type PropsWithChildren, useRef } from 'react';

import { useWritingDirection } from '../../hooks/useWritingDirection.js';
import { splitAxisOf } from '../split/split-axis.js';
import { resizableColumn } from './table-columns.js';
import { useTableContext } from './table-context.js';

type TableHeaderCellProps = PropsWithChildren<{
    /** The id of the column it names, among the columns of its table. */
    column: string;
}>;

/**
 * The name of a column, and the edge that stretches it. A fixed column carries no name a
 * person reads and no line beside it, only what a screen reader needs.
 */
export function TableHeaderCell({ children, column }: TableHeaderCellProps) {
    const table = useTableContext();
    const fixed = table.columns.find((each) => each.id === column)?.kind === 'fixed';

    return (
        <th
            data-column={column}
            data-lead={fixed || undefined}
            data-part="table-header-cell"
            scope="col"
        >
            <span className="min-w-0 truncate">{children}</span>
            <TableResizeEdge column={column} />
        </th>
    );
}

/**
 * The right edge of a column: grab it and the edge follows the pointer, the column on each side
 * trading the width between them. The last column has none: its edge is the frame.
 */
function TableResizeEdge({ column }: { column: string }) {
    const table = useTableContext();
    const lastX = useRef<number | null>(null);
    const axis = splitAxisOf('row', useWritingDirection());

    if (!resizableColumn(table.columns, column)) {
        return null;
    }

    return (
        <span
            aria-hidden="true"
            data-part="table-resize"
            onPointerDown={(event: ReactPointerEvent<HTMLSpanElement>) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                lastX.current = axis.pointOf(event);
            }}
            onPointerMove={(event: ReactPointerEvent<HTMLSpanElement>) => {
                const cell = event.currentTarget.parentElement;

                if (lastX.current === null || cell === null) {
                    return;
                }

                table.resize({
                    deltaX: axis.pointOf(event) - lastX.current,
                    id: column,
                    width: cell.getBoundingClientRect().width,
                });
                lastX.current = axis.pointOf(event);
            }}
            onPointerUp={() => {
                lastX.current = null;
            }}
        />
    );
}
