import type { CollectionNode } from '@mandor/schema';
import { isGroup } from './group-nodes.js';

/**
 * The nodes that a gesture on many paths acts on, in the order the tree stands. A folder taken
 * along with something inside it answers for both: deleting or moving it already carries what it
 * holds, and acting on the inner one afterwards would reach a path that is gone. A path no node
 * answers to — the entry being named, a node deleted meanwhile — is left out.
 */
export function topmostNodes(
    nodes: readonly CollectionNode[],
    paths: readonly string[],
): CollectionNode[] {
    const taken = new Set(paths);

    return nodes.flatMap((node) => topmostUnder(node, taken));
}

function topmostUnder(node: CollectionNode, taken: ReadonlySet<string>): CollectionNode[] {
    if (taken.has(node.path)) {
        return [node];
    }

    if (!isGroup(node)) {
        return [];
    }

    return node.children.flatMap((child) => topmostUnder(child, taken));
}
