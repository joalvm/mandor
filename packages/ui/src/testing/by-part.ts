/**
 * `data-part` is what a component leaves in the DOM to say which one drew it, so it is what a
 * test reaches for when there is no role to ask by: a container, a zone, a panel. Written by
 * hand it is the same attribute selector typed out in every test, and a typo in one returns
 * `null` and makes the failure land somewhere else, on a line that has nothing wrong with it.
 *
 * Only where there is no role. A query by role and accessible name proves what a screen reader
 * uses, and nothing here replaces one.
 */

/** Every node carrying the part, in the order the document has them. */
export function allByPart(part: string, root: ParentNode = document): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)];
}

/** The first node carrying the part, or a failure that names the part that is missing. */
export function byPart(part: string, root: ParentNode = document): HTMLElement {
    const [found] = allByPart(part, root);

    if (found === undefined) {
        throw new Error(`nothing under the given root carries data-part="${part}"`);
    }

    return found;
}

/**
 * The name a row is announced by: the text of the `RowLabel` written inside it, which is what
 * the row points its `aria-labelledby` at. A row is a box —light, name, menu— and asking for
 * its whole text asks for the box.
 */
export function rowName(row: ParentNode): string {
    return byPart('row-label', row).textContent;
}

/** The names of every row under the given root, in the order the document has them. */
export function rowNames(root: ParentNode = document): string[] {
    return allByPart('row-label', root).map((label) => label.textContent);
}
