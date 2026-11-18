import type { Channel, Unsubscribe } from '@mandor/ipc';

import { createBridgeCall, type BridgeCall } from './bridge-call.js';
import type { BridgeIpc } from './bridge-ipc.js';
import { subscribe } from './subscribe.js';

/**
 * What an app builds the areas it adds to the core with: one `invoke` per channel and one
 * listener per push. `ipcRenderer` stays inside the kit, so an area of an app names channels
 * and nothing else, the same as an area of the core.
 */
export type BridgeKit = {
    call: BridgeCall;
    subscribe: (channel: Channel, deliver: (push: unknown) => void) => Unsubscribe;
};

export function bridgeKitOf(ipc: BridgeIpc): BridgeKit {
    return {
        call: createBridgeCall(ipc),
        subscribe: (channel, deliver) => subscribe(ipc, channel, deliver),
    };
}
