import type { ResourceUri } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';

import { activityStore } from '../../../activity/activity-store.js';
import { composerEventsStore } from '../../../events/composer-events-store.js';
import { asyncBridge } from '../../../app/async-bridge.js';

/**
 * What the connection stops holding when its view closes: the socket, and the buffer of what
 * came through it. The connection itself stays in the collection with its configuration, so
 * opening it again is one click and nothing was lost but the frames already read.
 *
 * The close goes to main whatever state the window last saw: main may still hold a socket the
 * window reads as closed — a retry waiting out its backoff — and closing an id main does not
 * hold is already a no-op there.
 */
export function releaseConnection(connectionId: string, resource: ResourceUri): void {
    fireAndForget(asyncBridge.ws.close({ connectionId }));
    activityStore.getState().clearActivity(resource);
    composerEventsStore.getState().clear(connectionId);
}
