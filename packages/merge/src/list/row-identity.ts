import { isObject, ownValue } from '../value/plain-object.js';

export type Row = Record<string, unknown>;

/** The three lists of a list of rows, and the field that tells one row from another. */
export type IdentifiedRows = { field: string; base: Row[]; ours: Row[]; theirs: Row[] };

/** In this order: an `id` says more than a `name`, and a `name` more than a `key`. */
const IDENTITY_FIELDS = ['id', 'name', 'key'] as const;

function rowsOnly(list: readonly unknown[]): Row[] | undefined {
    const rows = list.filter(isObject);

    return rows.length === list.length ? rows : undefined;
}

function hasStringField(rows: readonly Row[], field: string): boolean {
    return rows.every((row) => typeof ownValue(row, field) === 'string');
}

/**
 * The field that names every row of the three lists, or nothing. It has to be there as a string
 * in all of them: a field half the rows lack cannot tell a row from a new one.
 */
export function identifyRows(
    base: readonly unknown[],
    ours: readonly unknown[],
    theirs: readonly unknown[],
): IdentifiedRows | undefined {
    const baseRows = rowsOnly(base);
    const oursRows = rowsOnly(ours);
    const theirsRows = rowsOnly(theirs);

    if (baseRows === undefined || oursRows === undefined || theirsRows === undefined) {
        return undefined;
    }

    const lists = [baseRows, oursRows, theirsRows];
    const field = IDENTITY_FIELDS.find((each) => lists.every((rows) => hasStringField(rows, each)));

    if (field === undefined) {
        return undefined;
    }

    return { field, base: baseRows, ours: oursRows, theirs: theirsRows };
}

/**
 * The rows by key: their identity and how many rows before them in the list had the same one.
 * A repeated key is legal (two `Accept` headers), so the identity alone would merge them.
 */
export function keyedRows(rows: readonly Row[], field: string): Map<string, Row> {
    const seen = new Map<string, number>();
    const keyed = new Map<string, Row>();

    for (const row of rows) {
        const identity = String(ownValue(row, field));
        const occurrence = seen.get(identity) ?? 0;

        seen.set(identity, occurrence + 1);
        keyed.set(`${identity}#${String(occurrence)}`, row);
    }

    return keyed;
}
