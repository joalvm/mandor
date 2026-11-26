import { useMessages } from '@mandor/i18n';
import { IconButton, TableRowActions } from '@mandor/ui';

/** One line of a response table: what it says, and the text a copy of it puts on the clipboard. */
export type ResponseRowData = {
    copy: string;
    name: string;
    value: string;
};

type ResponseTableRowProps = {
    onCopy: (text: string) => void;
    row: ResponseRowData;
};

/** A line of the table. The copy button waits for the pointer or the keyboard to reach the line. */
export function ResponseTableRow({ onCopy, row }: ResponseTableRowProps) {
    const labels = useMessages('requests');

    return (
        <tr data-part="response-row">
            <td>{row.name}</td>
            <td>{row.value}</td>
            <TableRowActions>
                <IconButton
                    icon="copy"
                    label={labels('copy')}
                    onClick={() => {
                        onCopy(row.copy);
                    }}
                    size="sm"
                />
            </TableRowActions>
        </tr>
    );
}
