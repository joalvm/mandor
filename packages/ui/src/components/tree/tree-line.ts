/**
 * One visible line of a tree: what it is called in the tree, how deep it sits and, for a folder,
 * whether it is open. A leaf leaves `expanded` out, and that absence is what tells the two apart:
 * a folder that is closed still folds, a leaf never does.
 *
 * The tree is handed its lines already flattened, in the order they stand on screen, with the
 * children of a closed folder left out. Who owns the nodes decides what is open; the tree only
 * walks what it was given.
 */
export type TreeLine = {
    expanded?: boolean | undefined;
    id: string;
    /** One for the lines at the root, and one more per folder above. */
    level: number;
};

/** The line of the folder this one hangs from, or -1 for a line of the first level. */
export function parentIndexOf(lines: readonly TreeLine[], index: number): number {
    const level = lines[index]?.level ?? 1;

    for (let above = index - 1; above >= 0; above -= 1) {
        if ((lines[above]?.level ?? level) < level) {
            return above;
        }
    }

    return -1;
}

/** The first line inside an open folder, or -1 when it is closed, empty or not a folder. */
export function firstChildIndexOf(lines: readonly TreeLine[], index: number): number {
    const line = lines[index];
    const next = lines[index + 1];

    if (line?.expanded !== true || next === undefined) {
        return -1;
    }

    return next.level === line.level + 1 ? index + 1 : -1;
}

/** What folding this line would hide: every line after it that sits deeper, in order. */
export function descendantIdsOf(lines: readonly TreeLine[], index: number): string[] {
    const level = lines[index]?.level ?? 0;
    const ids: string[] = [];

    for (const line of lines.slice(index + 1)) {
        if (line.level <= level) {
            break;
        }

        ids.push(line.id);
    }

    return ids;
}

/**
 * The line that takes the tabulator, among the ones on screen: the focused one, else the first
 * one taken, else the first one drawn. A tree always leaves one of its drawn lines reachable, so
 * a focus scrolled out of the window never leaves the tabulator jumping over the whole tree.
 */
export function tabStopOf(
    lines: readonly TreeLine[],
    drawn: readonly number[],
    focused: string | null,
    taken: ReadonlySet<string>,
): number {
    const focusedIndex = drawn.find((index) => lines[index]?.id === focused);
    const takenIndex = drawn.find((index) => taken.has(lines[index]?.id ?? ''));

    return focusedIndex ?? takenIndex ?? drawn[0] ?? -1;
}
