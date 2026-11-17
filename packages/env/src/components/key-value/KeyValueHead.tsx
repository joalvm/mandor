import { useMessages } from '@mandor/i18n';
import { TableHead, TableHeaderCell, TableTools } from '@mandor/ui';
import type { ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import { cellColumnsOf, type KeyValueCell, type KeyValueColumns } from './key-value-line.js';
import { KeyValueTools } from './KeyValueTools.js';

type KeyValueHeadProps = {
    columns: KeyValueColumns;
};

/** The name each column of the head carries, from the messages of the environment namespace. */
const HEAD_LABELS = {
    description: 'keyValueColumnDescription',
    key: 'keyValueColumnKey',
    value: 'keyValueColumnValue',
} as const satisfies Record<KeyValueCell, string>;

/**
 * The head of the table: the handle and the switch, named only for a screen reader, the name
 * of each column in force with its edge to stretch it by, and the ways to work the whole table
 * over its end.
 */
export function KeyValueHead({ columns }: KeyValueHeadProps): ReactNode {
    const messages = useMessages('environment');

    return (
        <TableHead>
            <TableHeaderCell column="handle">
                <span className="sr-only">{messages('keyValueDrag')}</span>
            </TableHeaderCell>
            <CheckHead />
            {cellColumnsOf(columns).map((cell) => (
                <TableHeaderCell column={cell} key={cell}>
                    {messages(HEAD_LABELS[cell])}
                </TableHeaderCell>
            ))}
            <TableTools label={messages('keyValueActions')}>
                <KeyValueTools />
            </TableTools>
        </TableHead>
    );
}

function CheckHead() {
    const messages = useMessages('environment');
    const { checkable } = useKeyValueTable();

    if (!checkable) {
        return null;
    }

    return (
        <TableHeaderCell column="check">
            <span className="sr-only">{messages('entrySends')}</span>
        </TableHeaderCell>
    );
}
