import { bridge } from '@mandor/shell';

import { docsStore } from '../docs-store.js';

import { loadDocs } from './load-docs.js';

/**
 * Gives one doc another title. The file stays where it is, so its tabs do not move and nothing
 * closes: they read the new title off the list the moment it lands.
 *
 * A title that did not change is not sent: the same word again is nothing to do, and asking main
 * to do it would only write the file for no reason.
 */
export async function renameDoc(workspaceId: string, name: string, title: string): Promise<void> {
    const current = docsStore.getState().docs.find((doc) => doc.name === name);

    if (current?.title === title) {
        return;
    }

    const result = await bridge.doc.rename({ workspaceId, name, title });

    if (!result.ok) {
        docsStore.getState().setError(result.error.code);

        return;
    }

    await loadDocs(workspaceId);
}
