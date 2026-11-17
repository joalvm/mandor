import type { ResourceUri } from '@mandor/schema';

import { bridge } from '@mandor/shell';
import { docsStore } from '../docs-store.js';

import { docNameOf, docWorkspaceOf } from './doc-resource.js';

/**
 * Brings the text of one doc into the store, once. The entry belongs to the resource and not to
 * the tab that asked for it, so a second tab on the same file waits for this read instead of
 * starting another one, and a tab moved between groups keeps what it was showing. A file that
 * cannot be read says why, and the next tab that asks reads it again.
 */
export async function loadDocText(resource: ResourceUri): Promise<void> {
    if (!docsStore.getState().beginRead(resource)) {
        return;
    }

    try {
        const name = docNameOf(resource);
        const result = await bridge.doc.read({ workspaceId: docWorkspaceOf(resource), name });

        if (!result.ok) {
            docsStore.getState().setError(result.error.code);

            return;
        }

        docsStore.getState().setText(resource, result.value);
    } finally {
        docsStore.getState().endRead(resource);
    }
}
