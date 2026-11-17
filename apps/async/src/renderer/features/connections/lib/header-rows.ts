/**
 * A line of the header editor. The identity is the line's, not the header's: it is handed out
 * when the line appears and it survives the name being retyped, so the field the caret sits in
 * is the same element before and after the keystroke.
 */
export type HeaderRow = {
    id: string;
    name: string;
    value: string;
};

/** The lines that stand for a record of headers, in the order the record keeps them. */
export function rowsOf(headers: Record<string, string>): HeaderRow[] {
    return Object.entries(headers).map(([name, value], index) => ({
        id: String(index),
        name,
        value,
    }));
}

/**
 * The record a set of lines stands for. A line with no name names no header yet — it was opened
 * and has not been written — so it is not in the record, and a record cannot say it is there.
 * That is the whole reason the lines exist beside it.
 */
export function headersOf(rows: readonly HeaderRow[]): Record<string, string> {
    return Object.fromEntries(
        rows.filter((row) => row.name !== '').map((row) => [row.name, row.value]),
    );
}

/**
 * The names claimed by more than one line. A record keeps one value per name, so the second line
 * to claim a name is a line whose value will not be saved: the editor says so where it happens
 * instead of letting the row disappear on the next read.
 */
export function repeatedNames(rows: readonly HeaderRow[]): ReadonlySet<string> {
    const seen = new Set<string>();
    const repeated = new Set<string>();

    for (const row of rows) {
        if (row.name !== '' && seen.has(row.name)) {
            repeated.add(row.name);
        }

        seen.add(row.name);
    }

    return repeated;
}

/** Whether two records of headers say the same thing, whatever object carries them. */
export function sameHeaders(left: Record<string, string>, right: Record<string, string>): boolean {
    const names = Object.keys(left);

    return (
        names.length === Object.keys(right).length &&
        names.every((name) => left[name] === right[name])
    );
}

/** The lines with one more at the end, under an identity none of the others holds. */
export function withNewRow(rows: readonly HeaderRow[]): HeaderRow[] {
    const taken = rows.map((row) => Number(row.id)).filter((id) => Number.isSafeInteger(id));

    return [...rows, { id: String(Math.max(-1, ...taken) + 1), name: '', value: '' }];
}
