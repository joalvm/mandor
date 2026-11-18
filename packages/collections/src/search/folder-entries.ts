import type { CollectionNode } from '@mandor/schema';
import type { SearchEntry } from '@mandor/shell';

import { isGroup } from '../lib/group-nodes.js';
import { folderResource } from '../lib/folder-resource.js';

/**
 * The searchable envelope of every collection and folder of the tree, outermost first: each one
 * opens its own tab, and its trail names the groups that hold it.
 */
export function folderEntries(
    nodes: readonly CollectionNode[],
    origin: string,
    workspaceId: string,
): SearchEntry[] {
    return groupsUnder(nodes, [], { origin, workspaceId });
}

type Place = { origin: string; workspaceId: string };

function groupsUnder(
    nodes: readonly CollectionNode[],
    holders: readonly string[],
    place: Place,
): SearchEntry[] {
    return nodes.flatMap((node) => {
        if (!isGroup(node)) {
            return [];
        }

        const entry: SearchEntry = {
            name: node.name,
            resource: folderResource(place.origin, place.workspaceId, node.path),
            source: 'folder',
            tags: [],
            trail: holders.join(' / '),
        };

        return [entry, ...groupsUnder(node.children, [...holders, node.name], place)];
    });
}
