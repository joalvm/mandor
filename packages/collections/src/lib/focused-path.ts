/**
 * The path of the line the keypress came from, which is the line that has the focus. A key
 * pressed inside something the line holds — the rename field, the options button — belongs to
 * that control, so it stands on no line at all and moves or renames nothing.
 */
export function focusedPathOf(target: EventTarget | null): string | null {
    if (!(target instanceof Element) || target.getAttribute('role') !== 'treeitem') {
        return null;
    }

    return target.closest('[data-path]')?.getAttribute('data-path') ?? null;
}
