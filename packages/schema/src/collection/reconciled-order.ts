/**
 * The order a folder actually has. The file states one and disk holds another: a repo merged by
 * hand arrives naming children that are gone and forgetting children that are there.
 *
 * The named ones that exist keep their place, once each, and the rest follow sorted by name. The
 * next write puts the file right, so a mismatch costs one reordering and never a broken view.
 */
export function reconciledOrder(order: readonly string[], present: readonly string[]): string[] {
    const missing = new Set(present);
    const known: string[] = [];

    for (const name of order) {
        if (missing.delete(name)) {
            known.push(name);
        }
    }

    return [...known, ...[...missing].toSorted()];
}
