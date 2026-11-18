import type { ResourceUri } from '@mandor/schema';

import { bridge } from '@mandor/shell';
import { docsStore } from '../docs-store.js';

import { docNameOf, docWorkspaceOf } from './doc-resource.js';
import { flushPendingDocWrite } from './pending-doc-write.js';

/**
 * Reads a doc again because its file changed on disk without the window. Whatever was typed and
 * not yet written goes first, so the text that comes back is the file with both changes in it
 * and the typing is never read over. A file that cannot be read leaves the text where it was.
 */
export async function reloadDocText(resource: ResourceUri): Promise<void> {
    await flushPendingDocWrite(resource);

    const result = await bridge.doc.read({
        workspaceId: docWorkspaceOf(resource),
        name: docNameOf(resource),
    });

    if (result.ok) {
        docsStore.getState().setText(resource, result.value);
    }
}
