/**
 * What a gesture on one row acts on: everything taken when the row is part of it, and the row
 * alone when it is not. The menu of a row follows the rule the Delete key follows in the tree,
 * so the same row asks about the same entries whichever way the question came.
 */
export function actedPaths(selected: readonly string[], path: string): string[] {
    return selected.includes(path) ? [...selected] : [path];
}
