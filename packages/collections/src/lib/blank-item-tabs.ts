import type { CollectionNode } from '@mandor/schema';
import { originName, selectOpenResources, shellStore } from '@mandor/shell';

import { exampleRootOf } from './example-resource.js';
import { folderResource } from './folder-resource.js';
import { groupPathsUnder, itemPathsUnder } from './item-paths-under.js';
import { itemResource } from './item-resource.js';

/**
 * Leaves the tabs of everything under a deleted node open and pointing at nothing. Closing
 * them would throw away whatever was unsaved in them over a decision taken in the tree. The tabs
 * of the examples of each item are left the same way.
 */
export function blankItemTabs(workspaceId: string, node: CollectionNode): void {
    const origin = originName();
    const shell = shellStore.getState();

    for (const path of itemPathsUnder(node)) {
        const item = itemResource(origin, workspaceId, path);
        const examples = `${exampleRootOf(item)}/`;

        shell.removeResource(item);

        for (const resource of selectOpenResources(shell).filter((each) =>
            each.startsWith(examples),
        )) {
            shell.removeResource(resource);
        }
    }

    // The tab of a group that is gone stays open, saying so.
    for (const path of groupPathsUnder(node)) {
        shell.removeResource(folderResource(origin, workspaceId, path));
    }
}
