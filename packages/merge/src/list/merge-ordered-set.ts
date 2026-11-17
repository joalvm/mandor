type Added = Map<string | undefined, string[]>;

/**
 * What theirs added and the item each one goes right after (`undefined`: the start), oldest
 * first. The neighbour is the last item of theirs the result holds, an added one included.
 */
function addedAfter(
    kept: readonly string[],
    base: ReadonlySet<string>,
    theirs: readonly string[],
): Added {
    const present = new Set(kept);
    const added: Added = new Map();
    let neighbour: string | undefined;

    for (const item of theirs) {
        if (!present.has(item) && !base.has(item)) {
            present.add(item);
            added.set(neighbour, [...(added.get(neighbour) ?? []), item]);
        }

        neighbour = present.has(item) ? item : neighbour;
    }

    return added;
}

/** Each item, then what was added after it, the newest right next to it. One walk, no splice. */
function placeAdded(kept: readonly string[], added: Added): string[] {
    const result: string[] = [];
    const stack = [...kept].reverse();

    stack.push(...(added.get(undefined) ?? []));

    for (let item = stack.pop(); item !== undefined; item = stack.pop()) {
        result.push(item);
        stack.push(...(added.get(item) ?? []));
        added.delete(item);
    }

    return result;
}

/**
 * Strings that mean the same wherever they stand, such as the order of the items of a folder.
 * What either side removed is gone; what theirs added goes after the item that came before it
 * in theirs, or first. The order is ours, and nobody is asked about it: the answer would not
 * change what the list says. Sets and one walk: a folder of thousands of items stays linear.
 */
export function mergeOrderedSet(
    base: readonly string[],
    ours: readonly string[],
    theirs: readonly string[],
): string[] {
    const inBase = new Set(base);
    const inTheirs = new Set(theirs);
    const kept = ours.filter((item) => !inBase.has(item) || inTheirs.has(item));

    return placeAdded(kept, addedAfter(kept, inBase, theirs));
}
