import type { CollectionNode } from '@mandor/schema';
import { originName, shellStore } from '@mandor/shell';

import { exampleRootOf } from './example-resource.js';
import { folderResource } from './folder-resource.js';
import { groupPathsUnder, itemPathsUnder } from './item-paths-under.js';
import { itemResource } from './item-resource.js';

/**
 * Walks the tabs of everything under a node over to where the node now is. A folder that
 * changed name moved every item inside it, and each of those tabs is looking at a file whose
 * path stopped existing; none of them close, because nothing was deleted. The examples of each
 * item go with it: they hang from a root made of its path, and moving the root moves them all.
 */
export function moveItemTabs(workspaceId: string, node: CollectionNode, to: string): void {
    const origin = originName();
    const shell = shellStore.getState();

    for (const path of itemPathsUnder(node)) {
        const moved = `${to}${path.slice(node.path.length)}`;

        const from = itemResource(origin, workspaceId, path);
        const into = itemResource(origin, workspaceId, moved);

        shell.moveResource(from, into);
        shell.moveResource(exampleRootOf(from), exampleRootOf(into));
    }

    // The tab of the group and of every group under it go where they went.
    for (const path of groupPathsUnder(node)) {
        const moved = `${to}${path.slice(node.path.length)}`;

        shell.moveResource(
            folderResource(origin, workspaceId, path),
            folderResource(origin, workspaceId, moved),
        );
    }
}
