import { collectionTreeRequestSchema } from '@mandor/ipc';
import { readCollectionTree } from '@mandor/store-fs';

import { rootedHandler } from '../ipc/rooted-handler.js';
import { reportUnreadable, type UnreadableDeps } from '../notice/unreadable-files.js';

/** The tree, with the files that could not be read told apart instead of silently missing. */
export function readTree({ notices, logger }: UnreadableDeps) {
    return rootedHandler(collectionTreeRequestSchema, async (root, { workspaceId }) => {
        const { nodes, warnings } = await readCollectionTree(root, workspaceId);

        reportUnreadable(notices, logger, warnings);

        return nodes;
    });
}
