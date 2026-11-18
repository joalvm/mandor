import type { ErrorCode } from '@mandor/ipc';
import type { ResourceUri } from '@mandor/schema';

import { bridge, createPendingWrites } from '@mandor/shell';
import { docsStore } from '../docs-store.js';

import { docNameOf, docWorkspaceOf } from './doc-resource.js';

type DocWrite = { text: string; onFailure: (code: ErrorCode) => void };

const PENDING = createPendingWrites<ResourceUri, DocWrite>(writeNow);

/**
 * Puts a change on disk once the typing stops. The text reaches the store before it reaches disk:
 * whoever else is showing the file —the preview, the strip of an item— is looking at what was
 * typed, not at what was written.
 */
export function scheduleDocWrite(
    resource: ResourceUri,
    text: string,
    onFailure: (code: ErrorCode) => void,
): void {
    docsStore.getState().setText(resource, text);
    PENDING.schedule(resource, { text, onFailure });
}

/** Sends the write still waiting for the typing to stop now: the file is about to be read again. */
export function flushPendingDocWrite(resource: ResourceUri): Promise<void> {
    return PENDING.flush(resource);
}

/** Drops a write that has not gone out yet, so a revert is not undone a moment after it lands. */
export function cancelDocWrite(resource: ResourceUri): void {
    PENDING.cancel(resource);
}

async function writeNow(resource: ResourceUri, { text, onFailure }: DocWrite): Promise<void> {
    const result = await bridge.doc.write({
        workspaceId: docWorkspaceOf(resource),
        name: docNameOf(resource),
        text,
    });

    if (!result.ok) {
        onFailure(result.error.code);
    }
}
