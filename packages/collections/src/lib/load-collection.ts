import { bridge, createLatestRead } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';

/** The tree on screen is the one of the workspace asked for last. */
const ask = createLatestRead();

/** Reads the tree of a workspace, replacing whatever the previous one left on screen. */
export async function loadCollection(workspaceId: string): Promise<void> {
    const latest = ask();
    const result = await bridge.collections.tree({ workspaceId });
    const store = collectionStore.getState();

    if (!latest()) {
        return;
    }

    if (!result.ok) {
        store.setError(result.error.code);

        return;
    }

    store.setNodes(result.value);
}
