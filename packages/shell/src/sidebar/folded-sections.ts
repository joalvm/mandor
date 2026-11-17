/**
 * The folded sections once one opens or folds. Folded ids stay in the order they were written, so
 * the session file keeps still.
 */
export function withFolded(collapsed: readonly string[], id: string, open: boolean): string[] {
    if (open) {
        return collapsed.filter((folded) => folded !== id);
    }

    return collapsed.includes(id) ? [...collapsed] : [...collapsed, id];
}
