import type { ListedDoc, Result } from '@mandor/ipc';

import { bridge, createLatestRead } from '@mandor/shell';

import { docsStore } from '../docs-store.js';

/** The docs on screen are the ones of the workspace asked for last. */
const ask = createLatestRead();

/** Lists the docs of the open workspace, replacing whatever the previous one left behind. */
export async function loadDocs(workspaceId: string): Promise<Result<ListedDoc[]>> {
    const latest = ask();
    const result = await bridge.doc.list({ workspaceId });

    if (result.ok && latest()) {
        docsStore.getState().setDocs(result.value);
    }

    return result;
}
