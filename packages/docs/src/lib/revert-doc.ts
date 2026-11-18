import type { Result } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';

import { bridge } from '@mandor/shell';
import { docsStore } from '../docs-store.js';

import { docNameOf, docWorkspaceOf } from './doc-resource.js';
import { cancelDocWrite } from './pending-doc-write.js';

/**
 * The second level of undo: the editor takes back keystrokes, this takes back the file. What it
 * goes back to is the last commit, which is why a write does not commit.
 *
 * The pending write is dropped first. Otherwise the pause that is still running would put the
 * text that was just undone straight back on disk.
 */
export async function revertDoc(resource: ResourceUri): Promise<Result<string>> {
    cancelDocWrite(resource);

    const result = await bridge.doc.revert({
        workspaceId: docWorkspaceOf(resource),
        name: docNameOf(resource),
    });

    if (result.ok) {
        docsStore.getState().setText(resource, result.value);
    }

    return result;
}
