import { useMessages } from '@mandor/i18n';
import { IconButton, TableLeadCell } from '@mandor/ui';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import type { KeyValueLine } from './key-value-line.js';

type KeyValueDragHandleProps = {
    line: KeyValueLine;
};

/**
 * The handle that carries a row across the table. It shows itself while the pointer is on the
 * row, holds the pointer while it moves, and every crossing writes the new order at once: the
 * order of the rows is the order of the data, and no second state travels with the drag.
 */
export function KeyValueDragHandle({ line }: KeyValueDragHandleProps): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    /**
     * The row the pointer stands over, counted among the rows that are not the carried one.
     * Only the rows on screen are drawn, so each one says where it stands in the whole table;
     * past the last of them, the end of it.
     */
    function targetIndex(clientY: number): number {
        const carried = table.lines.findIndex((each) => each.id === line.id);
        const rows = Array.from(
            table.rowsRef.current?.querySelectorAll<HTMLElement>(
                '[data-part="key-value-row"][data-index]',
            ) ?? [],
        ).filter((row) => row.dataset['kvRow'] !== line.id);
        const over = rows.find((row) => {
            const box = row.getBoundingClientRect();

            return clientY < box.top + box.height / 2;
        });

        if (over === undefined) {
            return table.lines.length - 1;
        }

        const index = Number(over.dataset['index']);

        return index > carried ? index - 1 : index;
    }

    const carry = (event: ReactPointerEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        table.setDragId(line.id);
    };

    const release = (): void => {
        table.setDragId(undefined);
    };

    return (
        <TableLeadCell>
            <IconButton
                className="opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100"
                icon="grip-vertical"
                label={messages('keyValueDrag')}
                onPointerCancel={release}
                onPointerDown={carry}
                onPointerMove={(event) => {
                    if (table.dragId === line.id) {
                        table.moveLine(line.id, targetIndex(event.clientY));
                    }
                }}
                onPointerUp={release}
                size="sm"
                tabIndex={-1}
            />
        </TableLeadCell>
    );
}
