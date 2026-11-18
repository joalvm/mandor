import type { Channel, Unsubscribe } from '@mandor/ipc';

import type { BridgeIpc } from './bridge-ipc.js';

/**
 * Adds one listener and gives back the only thing that removes it. The renderer never sees the
 * emitter, so a subscription cannot outlive the handle its owner holds. A push that does not
 * parse throws at the delivery the caller gave: it is a bug in main, and it is louder thrown
 * than quietly believed.
 */
export function subscribe(
    ipc: BridgeIpc,
    channel: Channel,
    deliver: (push: unknown) => void,
): Unsubscribe {
    const listener = (_event: unknown, push: unknown): void => {
        deliver(push);
    };

    ipc.on(channel, listener);

    return () => {
        ipc.removeListener(channel, listener);
    };
}
