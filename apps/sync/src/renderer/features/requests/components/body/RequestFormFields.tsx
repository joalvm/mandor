import { EntryLineRow } from '@mandor/env';
import { AddIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Environment, RequestFormField, Variable } from '@mandor/schema';
import { Button, Select } from '@mandor/ui';

import { formFieldsOf, formRowsOf, type FormFieldRow } from '../../lib/form-rows.js';

type RequestFormFieldsProps = {
    environment: Environment | undefined;
    fields: RequestFormField[];
    onChange: (fields: RequestFormField[]) => void;
    /** The variables a value names and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * The rows of a form body: what each entry is called, what it says, and whether the value is
 * written here or names a file of the repo.
 */
export function RequestFormFields({
    environment,
    fields,
    onChange,
    onVariablesChange,
}: RequestFormFieldsProps) {
    const labels = useMessages('requests');
    const rows = formRowsOf(fields);
    const kindOptions = [
        { label: labels('formText'), value: 'text' as const },
        { label: labels('formFile'), value: 'file' as const },
    ];

    function edit(id: string, part: Partial<FormFieldRow>): void {
        onChange(
            formFieldsOf(
                rows.map((row) => (row.id === id ? { ...row, ...part } : row)),
                fields,
            ),
        );
    }

    return (
        <div className="flex min-h-0 flex-col gap-gap-control" data-part="request-form-fields">
            {rows.map((row) => (
                <div className="flex min-w-0 items-center gap-gap-control" key={row.id}>
                    <Select
                        className="w-24 shrink-0"
                        label={labels('formKind')}
                        onValueChange={(kind) => {
                            edit(row.id, { kind });
                        }}
                        options={kindOptions}
                        value={row.kind}
                    />
                    <EntryLineRow
                        environment={environment}
                        invalid={false}
                        line={row}
                        onEdit={(part) => {
                            edit(row.id, part);
                        }}
                        onRemove={() => {
                            onChange(
                                formFieldsOf(
                                    rows.filter((each) => each.id !== row.id),
                                    fields,
                                ),
                            );
                        }}
                        onVariablesChange={onVariablesChange}
                    />
                </div>
            ))}
            <div className="flex min-w-0 items-center gap-gap-control">
                <div className="w-24 shrink-0" />
                <Button
                    className="self-end"
                    onClick={() => {
                        onChange([...fields, { enabled: true, key: '', kind: 'text', value: '' }]);
                    }}
                    size="sm"
                    variant="secondary"
                >
                    <AddIcon size="sm" />
                    {labels('addEntry')}
                </Button>
            </div>
        </div>
    );
}
