import { useMessages } from '@mandor/i18n';

import { VariableInput } from '../field/VariableInput.js';
import { useKeyValueTable } from './key-value-context.js';

type KeyValueDescriptionCellProps = {
    onChange: (description: string) => void;
    value: string;
};

/**
 * The description of a row, drawn only while the table shows that column. A line and the empty
 * row at the end write into the same cell; they only differ in what a keystroke does.
 */
export function KeyValueDescriptionCell({ onChange, value }: KeyValueDescriptionCellProps) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (!table.columns.description) {
        return null;
    }

    return (
        <td data-kv-cell="description" data-part="key-value-cell">
            <VariableInput
                className="min-w-0 flex-1"
                environment={table.environment}
                label={messages('keyValueColumnDescription')}
                onKeyDown={table.walk}
                onChange={onChange}
                placeholder={table.stacked ? messages('keyValueColumnDescription') : undefined}
                onVariablesChange={table.onVariablesChange}
                value={value}
                variant="flat"
            />
        </td>
    );
}
