import type { ErrorCode } from '@mandor/ipc';
import type { HistoryEntry } from '@mandor/schema';

import { syncBridge } from '../../../app/sync-bridge.js';

export type EntryRead = { entry: HistoryEntry; ok: true } | { code: ErrorCode; ok: false };

/**
 * One send in full. A send that is no longer there and one that cannot be read answer the same
 * way, because from the window the two are the same: nothing to show, and a code to say so.
 */
export async function fetchHistoryEntry(workspaceId: string, id: string): Promise<EntryRead> {
    const result = await syncBridge.history.read({ id, workspaceId });

    return result.ok ? { entry: result.value, ok: true } : { code: result.error.code, ok: false };
}
