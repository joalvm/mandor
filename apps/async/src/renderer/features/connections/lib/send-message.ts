import type { WsSendRequest } from '@mandor/ipc';
import { settlePendingWrites } from '@mandor/shell';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

/** The last frame of each connection on its way, so the next one goes after it. */
const LAST_SEND = new Map<string, Promise<void>>();

/**
 * Sends one frame as a template: main resolves it against the environment of the socket, so a
 * value of that environment is never a string in this window. A refusal lands on the connection
 * as a code the interface translates. Frames of one connection leave in the order they were sent,
 * whatever the writes before each one take.
 */
export function sendMessage(request: WsSendRequest): Promise<void> {
    const go = (): Promise<void> => sendNow(request);
    const { connectionId } = request;
    const turn = (LAST_SEND.get(connectionId) ?? Promise.resolve()).then(go, go).finally(() => {
        if (LAST_SEND.get(connectionId) === turn) {
            LAST_SEND.delete(connectionId);
        }
    });

    LAST_SEND.set(connectionId, turn);

    return turn;
}

/** Main reads the variables from disk: what was typed a moment ago has to reach it first. */
async function sendNow(request: WsSendRequest): Promise<void> {
    await settlePendingWrites();

    const result = await asyncBridge.ws.send(request);

    if (!result.ok) {
        connectionsStore.getState().setConnectionError(request.connectionId, result.error.code);
    }
}
