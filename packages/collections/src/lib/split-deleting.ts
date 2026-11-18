import type { CollectionItemExample, CollectionItemNode, CollectionNode } from '@mandor/schema';

import { exampleRowParts } from './example-row-id.js';
import { isGroup } from './group-nodes.js';
import { nodeAt } from './node-at.js';
import { topmostNodes } from './topmost-nodes.js';

/** An example waiting to be deleted, and the item it hangs from. */
export type DoomedExample = { example: CollectionItemExample; item: CollectionItemNode };

/** What «delete these lines» reaches: whole nodes, and examples whose item stays. */
export type Doomed = { examples: DoomedExample[]; nodes: CollectionNode[] };

/**
 * Tells apart the lines handed over to be deleted. A node answers for itself and for what it
 * holds, as `topmostNodes` says; an example whose item goes with a node is not counted again,
 * since deleting the item takes it along, and an id no line answers to is left out.
 */
export function splitDeleting(nodes: readonly CollectionNode[], ids: readonly string[]): Doomed {
    const doomed = topmostNodes(nodes, ids);
    const examples = ids.flatMap((id) => exampleOf(nodes, id));

    return {
        examples: examples.filter(({ item }) => !doomed.some((node) => covers(node, item.path))),
        nodes: doomed,
    };
}

function covers(node: CollectionNode, path: string): boolean {
    return node.path === path || path.startsWith(`${node.path}/`);
}

function exampleOf(nodes: readonly CollectionNode[], id: string): DoomedExample[] {
    const parts = exampleRowParts(id);

    if (parts === null) {
        return [];
    }

    const item = nodeAt(nodes, parts.itemPath);

    if (item === null || isGroup(item)) {
        return [];
    }

    const example = item.examples?.find((each) => each.key === parts.key);

    return example === undefined ? [] : [{ example, item }];
}
