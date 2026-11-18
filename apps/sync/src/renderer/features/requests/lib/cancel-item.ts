import { syncBridge } from '../../../app/sync-bridge.js';
import { requestsStore } from '../requests-store.js';

/**
 * Cuts the send in flight of a resource. The answer of the send itself says how it ended, so
 * this one has nothing to report: with nothing in flight there is nothing to cut.
 */
export async function cancelItem(resource: string): Promise<void> {
    const entry = requestsStore.getState().sends[resource];

    if (entry?.state !== 'sending') {
        return;
    }

    await syncBridge.request.cancel({ sendId: entry.sendId });
}
