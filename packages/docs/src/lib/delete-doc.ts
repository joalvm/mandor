import { bridge, originName, shellStore } from '@mandor/shell';

import { docsStore } from '../docs-store.js';

import { docResource } from './doc-resource.js';
import { loadDocs } from './load-docs.js';

/**
 * Deletes one doc. Its tabs stay open, marked as looking at nothing, the way a deleted entry of
 * the collections leaves them. A refusal leaves the file, its tabs and the list as they were.
 */
export async function deleteDoc(workspaceId: string, name: string): Promise<void> {
    const result = await bridge.doc.delete({ workspaceId, name });

    if (!result.ok) {
        docsStore.getState().setError(result.error.code);

        return;
    }

    const resource = docResource(originName(), workspaceId, name);

    shellStore.getState().removeResource(resource);
    docsStore.getState().forgetText(resource);
    await loadDocs(workspaceId);
}
