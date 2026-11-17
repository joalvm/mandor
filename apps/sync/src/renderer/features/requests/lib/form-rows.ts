import type { EntryLine } from '@mandor/env';
import type { RequestFormField } from '@mandor/schema';

/** A line of the form editor: an entry line that also says whether its value names a file. */
export type FormFieldRow = EntryLine & { kind: 'text' | 'file' };

/** The fields as rows of the editor: one identity per position, each with its kind of value. */
export function formRowsOf(fields: readonly RequestFormField[]): FormFieldRow[] {
    return fields.map((field, index) => ({
        disabled: !field.enabled,
        id: String(index),
        kind: field.kind,
        name: field.key,
        value: field.value,
    }));
}

/**
 * The rows the editor leaves, back into fields. The editor draws a kind, a name, a value and a
 * switch; whatever else a field carries — the contract a document gave it, its words, its type —
 * it keeps, found by the position it was drawn at.
 */
export function formFieldsOf(
    rows: readonly FormFieldRow[],
    previous: readonly RequestFormField[],
): RequestFormField[] {
    return rows.map((row) => ({
        ...previous[Number(row.id)],
        enabled: !row.disabled,
        key: row.name,
        kind: row.kind,
        value: row.value,
    }));
}
