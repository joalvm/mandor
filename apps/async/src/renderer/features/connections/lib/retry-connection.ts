import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

/** Cancels the wait of a pending reconnect and opens again now. A refusal lands as an error state. */
export async function retryConnectionNow(connectionId: string): Promise<void> {
    const result = await asyncBridge.ws.retryNow({ connectionId });

    if (!result.ok) {
        connectionsStore.getState().setConnectionError(connectionId, result.error.code);
    }
}
