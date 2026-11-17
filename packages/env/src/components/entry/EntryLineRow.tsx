import { useMessages } from '@mandor/i18n';
import type { Environment, Variable } from '@mandor/schema';
import { Checkbox, IconButton, Input } from '@mandor/ui';

import type { EntryLine } from '../../lib/entry-line.js';
import { VariableInput } from '../field/VariableInput.js';

type EntryLineRowProps = {
    environment: Environment | undefined;
    invalid: boolean;
    line: EntryLine;
    onEdit: (part: Partial<EntryLine>) => void;
    onRemove: () => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/** One entry of the list: whether it is sent, what it is called, what it says, and its way out. */
export function EntryLineRow({
    environment,
    invalid,
    line,
    onEdit,
    onRemove,
    onVariablesChange,
}: EntryLineRowProps) {
    const messages = useMessages('environment');

    return (
        <div className="flex min-w-0 items-center gap-gap-control" data-part="entry-line-row">
            <Checkbox
                checked={!line.disabled}
                label={messages('entrySends')}
                onCheckedChange={(checked) => {
                    onEdit({ disabled: !checked });
                }}
            />
            <Input
                className="min-w-0 flex-1 font-mono"
                invalid={invalid}
                label={messages('entryName')}
                onValueChange={(name) => {
                    onEdit({ name });
                }}
                value={line.name}
            />
            <VariableInput
                className="min-w-0 flex-1 font-mono"
                environment={environment}
                label={messages('entryValue')}
                onChange={(value) => {
                    onEdit({ value });
                }}
                onVariablesChange={onVariablesChange}
                value={line.value}
            />
            <IconButton
                icon="delete"
                label={messages('entryRemove')}
                onClick={onRemove}
                size="sm"
            />
        </div>
    );
}
