import type { CollectionItemExample, CollectionItemNode, CollectionNode } from '@mandor/schema';
import type { TreeLine } from '@mandor/ui';

import { exampleRowId } from './example-row-id.js';
import { isGroup } from './group-nodes.js';

/**
 * A line of the tree, and the node the collection draws on it. On the line of an example the
 * node is the item the example hangs from.
 */
export type CollectionRow = TreeLine & {
    node: CollectionNode;
    example?: CollectionItemExample | undefined;
};

/**
 * The tree as the list draws it: one row per visible node, deepest last. Flat is what a window
 * can draw a part of; the levels travel on the rows so nothing downstream has to walk the tree
 * again to know how deep a row is. An item with examples is a row that opens, and holds its
 * examples one level further in unless somebody closed them.
 *
 * The folded and closed paths are looked up in sets: searched in their lists for every node, a
 * tree of three thousand folded groups took 78 ms each time it was laid out.
 */
export function collectionRows(
    nodes: readonly CollectionNode[],
    folded: readonly string[],
    closed: readonly string[],
): CollectionRow[] {
    return rowsIn(new Set(folded), new Set(closed), nodes, 1);
}

function rowsIn(
    folded: ReadonlySet<string>,
    closed: ReadonlySet<string>,
    nodes: readonly CollectionNode[],
    level: number,
): CollectionRow[] {
    return nodes.flatMap((node) => nodeRows(folded, closed, node, level));
}

function nodeRows(
    folded: ReadonlySet<string>,
    closed: ReadonlySet<string>,
    node: CollectionNode,
    level: number,
): CollectionRow[] {
    if (!isGroup(node)) {
        return itemRows(closed, node, level);
    }

    const expanded = !folded.has(node.path);
    const row: CollectionRow = { expanded, id: node.path, level, node };

    if (!expanded) {
        return [row];
    }

    return [row, ...rowsIn(folded, closed, node.children, level + 1)];
}

function itemRows(
    closed: ReadonlySet<string>,
    node: CollectionItemNode,
    level: number,
): CollectionRow[] {
    const { examples } = node;

    if (examples === undefined) {
        return [{ id: node.path, level, node }];
    }

    const expanded = !closed.has(node.path);
    const row: CollectionRow = { expanded, id: node.path, level, node };

    return expanded ? [row, ...exampleRows(node, examples, level + 1)] : [row];
}

function exampleRows(
    node: CollectionItemNode,
    examples: readonly CollectionItemExample[],
    level: number,
): CollectionRow[] {
    return examples.map((example) => ({
        id: exampleRowId(node.path, example.key),
        level,
        node,
        example,
    }));
}
