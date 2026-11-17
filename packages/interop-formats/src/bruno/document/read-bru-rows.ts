import type { BruRow } from './bru-schema.js';
import type { BrunoRow, BrunoVariable } from './bruno-tree.js';

/** The text of a value; a field that sends a file lists its paths, and the first is the one. */
export function valueOfRow(value: BruRow['value']): string {
    return typeof value === 'string' ? value : (value?.[0] ?? '');
}

/** The rows of a table of headers or parameters; a switched-off row stays. */
export function rowsOfBru(rows: readonly BruRow[] | null | undefined): BrunoRow[] {
    return (rows ?? []).map((row) => ({
        name: row.name ?? '',
        value: valueOfRow(row.value),
        disabled: row.enabled === false,
    }));
}

/** The variables of a level: a `.bru` file cannot mark one secret. */
export function variablesOfBru(rows: readonly BruRow[] | null | undefined): BrunoVariable[] {
    return rowsOfBru(rows).map((row) => ({ ...row, secret: false }));
}

/** The parameters of one kind: a parameter that says no kind is a query one. */
export function paramsOfBru(
    rows: readonly BruRow[] | null | undefined,
    type: 'query' | 'path',
): BrunoRow[] {
    return rowsOfBru((rows ?? []).filter((row) => (row.type ?? 'query') === type));
}
