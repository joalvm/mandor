import type { CollectionNode } from '@mandor/schema';
import type { SearchEntry } from '@mandor/shell';

import { itemResource } from '../lib/item-resource.js';
import { isGroup } from '../lib/group-nodes.js';

/**
 * The searchable envelope of every item in the tree. The names of its folders are in the trail
 * of each item, so searching a folder name finds what it holds as well as the folder.
 */
export function itemEntries(
    nodes: readonly CollectionNode[],
    origin: string,
    workspaceId: string,
): SearchEntry[] {
    return entriesUnder(nodes, [], origin, workspaceId);
}

/** The entries of the nodes that hang from the same holders, named outermost first. */
function entriesUnder(
    nodes: readonly CollectionNode[],
    holders: readonly string[],
    origin: string,
    workspaceId: string,
): SearchEntry[] {
    return nodes.flatMap((node) => nodeEntries(node, holders, origin, workspaceId));
}

function nodeEntries(
    node: CollectionNode,
    holders: readonly string[],
    origin: string,
    workspaceId: string,
): SearchEntry[] {
    if (isGroup(node)) {
        return entriesUnder(node.children, [...holders, node.name], origin, workspaceId);
    }

    return [
        {
            name: node.name,
            resource: itemResource(origin, workspaceId, node.path),
            source: 'item',
            tags: node.tags,
            trail: holders.join(' / '),
        },
    ];
}
