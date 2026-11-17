import { useMessages } from '@mandor/i18n';
import {
    IconButton,
    Table,
    TableHead,
    TableHeaderCell,
    TableTools,
    type TableColumn,
} from '@mandor/ui';

import { ResponseTableRow, type ResponseRowData } from './ResponseTableRow.js';

type ResponseTableProps = {
    /** What the table is a table of: the name a screen reader announces it by. */
    label: string;
    onCopy: (text: string) => void;
    rows: readonly ResponseRowData[];
    showAttributes?: boolean;
};

const PAIRS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'value', kind: 'fluid', min: 'md', weight: 2 },
];

const WITH_ATTRIBUTES: readonly TableColumn[] = [
    ...PAIRS,
    { id: 'attributes', kind: 'fluid', min: 'md', weight: 1.5 },
];

/**
 * Names and values in the order they arrived, repeats included, on the table every list of
 * pairs lays on: read only, the head copies all of them and each line copies itself.
 */
export function ResponseTable({ label, onCopy, rows, showAttributes = false }: ResponseTableProps) {
    const labels = useMessages('requests');

    return (
        <Table columns={showAttributes ? WITH_ATTRIBUTES : PAIRS} label={label}>
            <TableHead>
                <TableHeaderCell column="name">{labels('columnName')}</TableHeaderCell>
                <TableHeaderCell column="value">{labels('columnValue')}</TableHeaderCell>
                <AttributesHead show={showAttributes} />
                <TableTools label={labels('columnActions')}>
                    <IconButton
                        icon="copy"
                        label={labels('copyAll')}
                        onClick={() => {
                            onCopy(rows.map((row) => row.copy).join('\n'));
                        }}
                        size="sm"
                    />
                </TableTools>
            </TableHead>
            <tbody data-part="response-rows">
                {rows.map((row, index) => (
                    <ResponseTableRow
                        key={`${row.name}:${String(index)}`}
                        onCopy={onCopy}
                        row={row}
                        showAttributes={showAttributes}
                    />
                ))}
            </tbody>
        </Table>
    );
}

function AttributesHead({ show }: { show: boolean }) {
    const labels = useMessages('requests');

    if (!show) {
        return null;
    }

    return <TableHeaderCell column="attributes">{labels('columnAttributes')}</TableHeaderCell>;
}
