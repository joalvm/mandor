import { useSyncExternalStore } from 'react';

import { outboundPort, subscribeOutbound } from '../../../outbound/outbound-registry.js';
import { onlyLiveTarget } from '../lib/only-live-target.js';

function destinationName(): string | null {
    return onlyLiveTarget(outboundPort()?.targets() ?? [])?.name ?? null;
}

function destinationEnvironment(): string | null {
    return onlyLiveTarget(outboundPort()?.targets() ?? [])?.environmentId ?? null;
}

/**
 * Where a send goes without asking, read before the press: the connection, by name, and the
 * environment it resolves against. No name means the press will ask.
 */
export function useSendDestination(): { environmentId: string | null; name: string | null } {
    const name = useSyncExternalStore(subscribeOutbound, destinationName);
    const environmentId = useSyncExternalStore(subscribeOutbound, destinationEnvironment);

    return { environmentId, name };
}
