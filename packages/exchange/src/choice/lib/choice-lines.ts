import type { TreeLine } from '@mandor/ui';

import type { ChoiceNode } from './choice-state.js';

/** One line of the choice tree: where the `Tree` walks it, and the node it draws. */
export type ChoiceLine = TreeLine & { node: ChoiceNode };

/** A line is named by its node, so a node's id and the id of a line never meet by chance. */
function lineIdOf(node: ChoiceNode): string {
    return `node:${node.id}`;
}

/**
 * The nodes as the `Tree` walks them: every line in the order it stands on screen, one level
 * deeper under the node it hangs from, and nothing of what a folded node holds. `folded` speaks
 * in line ids.
 */
export function choiceLines(
    nodes: readonly ChoiceNode[],
    folded: ReadonlySet<string>,
    level = 1,
): ChoiceLine[] {
    return nodes.flatMap((node) => {
        const id = lineIdOf(node);
        const expanded = node.children.length > 0 ? !folded.has(id) : undefined;
        const below = expanded === true ? choiceLines(node.children, folded, level + 1) : [];

        return [{ expanded, id, level, node }, ...below];
    });
}

/**
 * What a big choice opens folded: every branch except the ones that ask to start open, so a long
 * document reads as a list of what it carries.
 */
export function foldedByDefault(nodes: readonly ChoiceNode[]): Set<string> {
    return new Set(
        nodes.flatMap((node) => {
            const own = node.children.length > 0 && node.open !== true ? [lineIdOf(node)] : [];

            return [...own, ...foldedByDefault(node.children)];
        }),
    );
}

/** The folds once one line opened or closed: a new set, so the tree sees the change. */
export function foldedAfter(
    folded: ReadonlySet<string>,
    id: string,
    expanded: boolean,
): Set<string> {
    const next = new Set(folded);

    if (expanded) {
        next.delete(id);

        return next;
    }

    return next.add(id);
}

/** The id of the line of every branch, at any depth: what «fold all» closes. */
export function foldableIds(nodes: readonly ChoiceNode[]): string[] {
    return nodes.flatMap((node) => [
        ...(node.children.length > 0 ? [lineIdOf(node)] : []),
        ...foldableIds(node.children),
    ]);
}

/**
 * Keeps the nodes whose name matches, with everything they hold, and the ones with a match below
 * them, with only the part that matches: what a press then speaks for is what is on screen.
 */
export function filterNodes(nodes: readonly ChoiceNode[], needle: string): ChoiceNode[] {
    const lower = needle.trim().toLowerCase();

    if (lower === '') {
        return [...nodes];
    }

    return nodes.flatMap((node) => {
        if (node.label.toLowerCase().includes(lower)) {
            return [node];
        }

        const children = filterNodes(node.children, lower);

        return children.length > 0 ? [{ ...node, children }] : [];
    });
}
