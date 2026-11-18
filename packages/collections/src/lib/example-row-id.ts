/**
 * The id of the line of an example in the tree: the path of its item and its key. A colon cannot
 * be in a path, so no example line ever shares its id with a node.
 */
export function exampleRowId(itemPath: string, key: string): string {
    return `${itemPath}:${key}`;
}

/** The item path and the key an example line answers to, or nothing for the id of a node. */
export function exampleRowParts(id: string): { itemPath: string; key: string } | null {
    const colon = id.indexOf(':');

    if (colon === -1) {
        return null;
    }

    return { itemPath: id.slice(0, colon), key: id.slice(colon + 1) };
}
