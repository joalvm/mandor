import { freeName } from '@mandor/schema';

import { bridge } from '@mandor/shell';
import { docsStore } from '../docs-store.js';

import { loadDocs } from './load-docs.js';
import { openDoc } from './open-doc.js';

/**
 * Makes one doc at once and opens it, under the word it is born with — numbered when another doc
 * wears it — and leaves its row naming it: a title nobody typed keeps that word. Main draws the
 * file, and the answer is the name it drew: the window never makes one up.
 *
 * It opens because that is what making one is for. What it opens on is not decided here: the
 * doc is empty, and an empty doc is shown as the editor by whoever draws the tab.
 */
export async function createDoc(workspaceId: string, title: string): Promise<void> {
    const taken = docsStore.getState().docs.map((doc) => doc.title);
    const result = await bridge.doc.create({ workspaceId, title: freeName(title, taken) });

    if (!result.ok) {
        docsStore.getState().setError(result.error.code);

        return;
    }

    await loadDocs(workspaceId);
    openDoc(workspaceId, result.value);
    docsStore.getState().setRenaming(result.value);
}
