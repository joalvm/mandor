import type { HistoryDeleteRequest } from '@mandor/ipc';
import { listHistory, orphanBodies, removeHistoryEntries } from '@mandor/store-fs';

import { removeUnheldBodies } from '../request/body-holds.js';
import { historyElsewhere } from './history-elsewhere.js';

/**
 * Deletes the sends a request names, or every one of the workspace. The entries are read first
 * so a body is removed only when none of the sends that stay names it, in this workspace or in
 * any other of the origin, whose bodies share the store, and no send in flight holds it.
 */
export async function deleteHistory(root: string, request: HistoryDeleteRequest): Promise<void> {
    const { workspaceId } = request;
    const { entries } = await listHistory(root, workspaceId);
    const named = 'all' in request ? null : new Set(request.ids);
    const remove = entries.filter((entry) => named === null || named.has(entry.id));
    const keep = entries.filter((entry) => !remove.includes(entry));
    const elsewhere = await historyElsewhere(root, workspaceId, orphanBodies(remove, keep));

    await removeHistoryEntries(
        root,
        workspaceId,
        remove.map((entry) => entry.id),
    );
    await removeUnheldBodies(root, orphanBodies(remove, [...keep, ...elsewhere]));
}

/** Before a workspace goes: its sends go, and the bodies no other workspace of the origin names. */
export function forgetWorkspaceHistory(root: string, workspaceId: string): Promise<void> {
    return deleteHistory(root, { workspaceId, all: true });
}
