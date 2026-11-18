/** The key a document writes for a table, or nothing at all when the table has no rows. */
export function listedRows(key: string, rows: readonly unknown[]): Record<string, unknown[]> {
    return rows.length === 0 ? {} : { [key]: [...rows] };
}
