import { useMessages } from '@mandor/i18n';
import { Table, TableHead, TableHeaderCell, type TableColumn } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

type DiffTableProps = PropsWithChildren<{
    /** What the rows are: the name of the table, and of its first column for a screen reader. */
    label: string;
}>;

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'sm', weight: 1 },
    { id: 'earlier', kind: 'fluid', min: 'md', weight: 1.5 },
    { id: 'later', kind: 'fluid', min: 'md', weight: 1.5 },
];

/**
 * The table both comparisons lay their lines on: what each line is, then the earlier and the
 * later side by side, on the table every list of rows in the window shares.
 */
export function DiffTable({ children, label }: DiffTableProps) {
    const labels = useMessages('history');

    return (
        <div className="flex min-w-0 flex-col px-pad-panel pb-gap-section" data-part="diff-table">
            <Table columns={COLUMNS} label={label}>
                <TableHead>
                    <TableHeaderCell column="name">
                        <span className="sr-only">{label}</span>
                    </TableHeaderCell>
                    <TableHeaderCell column="earlier">{labels('diffEarlier')}</TableHeaderCell>
                    <TableHeaderCell column="later">{labels('diffLater')}</TableHeaderCell>
                </TableHead>
                <tbody>{children}</tbody>
            </Table>
        </div>
    );
}
