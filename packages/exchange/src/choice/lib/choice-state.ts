import type { IconName } from '@mandor/icons';

/** One line of a tree the user chooses from: its name, what hangs below it, and whether it can be chosen. */
export type ChoiceNode = {
    children: ChoiceNode[];
    /** The glyph of the line; null draws none. */
    icon: IconName | null;
    /** Stable while the choice lasts and never empty: the chosen set speaks in these. */
    id: string;
    label: string;
    /** The method of a request, worn in place of the glyph: the verb says what the line is. */
    mark?: string | undefined;
    /** A branch the tree opens at first; every other one starts folded. */
    open?: boolean | undefined;
    /**
     * What the node loses on the way in, when it can still be chosen. The words go in a tooltip
     * beside a quiet glyph; a node with a `reason` shows that and not this.
     */
    note?: string | undefined;
    /**
     * Present when the node can never be chosen: the app keeps no place for it, or someone holds
     * its place. The words go in a tooltip; empty, there is nothing to say and no tooltip.
     */
    reason?: string | undefined;
};

export type ChoiceState = 'checked' | 'mixed' | 'unchecked';

/**
 * What a node is chosen by: the leaves under it that nobody has barred. A node with a reason bars
 * everything it holds, and a folder with nothing in it is a leaf of its own.
 */
export function pickableIds(node: ChoiceNode): string[] {
    if (node.reason !== undefined) {
        return [];
    }

    return node.children.length === 0 ? [node.id] : node.children.flatMap(pickableIds);
}

/** How many of the leaves a node is chosen by are in `chosen`, out of how many there are. */
export function countOf(
    node: ChoiceNode,
    chosen: ReadonlySet<string>,
): { chosen: number; total: number } {
    const ids = pickableIds(node);

    return { chosen: ids.filter((id) => chosen.has(id)).length, total: ids.length };
}

/** A parent is checked when every leaf below it is, and mixed when only some are. */
export function stateOf(node: ChoiceNode, chosen: ReadonlySet<string>): ChoiceState {
    const count = countOf(node, chosen);

    if (count.chosen === 0) {
        return 'unchecked';
    }

    return count.chosen === count.total ? 'checked' : 'mixed';
}

/**
 * What pressing a node says: the whole branch in when any of it was out, and out when all of it
 * was in. A node nobody can choose says nothing. The set it was given is left as it was.
 */
export function toggle(chosen: ReadonlySet<string>, node: ChoiceNode): Set<string> {
    const next = new Set(chosen);
    const leaving = stateOf(node, chosen) === 'checked';

    for (const id of pickableIds(node)) {
        if (leaving) {
            next.delete(id);
        } else {
            next.add(id);
        }
    }

    return next;
}
