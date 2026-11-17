import { fireAndForget } from '@mandor/shell';
import type { TFunction } from 'i18next';

import type { Connection, ConnectionTransport } from '@mandor/schema';
import type { ToastRequest } from '@mandor/ui';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';

import { openSocket } from './open-socket.js';
import type { WorkspaceScope } from './workspace-scope.js';

/** Turns the switch of one connection. A refusal lands on it as a code the interface translates. */
export async function toggleConnection(
    connection: Connection,
    live: boolean,
    scope: WorkspaceScope,
): Promise<void> {
    if (!live) {
        await openSocket(connection, scope);

        return;
    }

    const closed = await asyncBridge.ws.close({ connectionId: connection.id });

    if (!closed.ok) {
        connectionsStore.getState().setConnectionError(connection.id, closed.error.code);
    }
}

/**
 * The transports this app knows how to dial today, one answer per transport. The record is
 * keyed by the transport union, so the transport that arrives tomorrow — gRPC, MQTT, SSE —
 * has to say here whether it dials before it compiles.
 */
const DIALABLE: Record<ConnectionTransport, boolean> = {
    socketio: true,
    websocket: true,
};

type ToggleRequest = {
    connection: Connection;
    live: boolean;
    /** The strip translates the warning itself: the decision to warn belongs to the lib. */
    translate: TFunction<'connections'>;
    notify: (request: ToastRequest) => void;
    scope: WorkspaceScope | null;
};

/**
 * Answers the switch of one connection. A variable nobody defined dials as the text it was
 * written: what the server makes of it is the person's to read in the activity.
 */
export function requestConnectionToggle(request: ToggleRequest): void {
    const { connection, live, notify, scope, translate } = request;

    if (scope === null) {
        return;
    }

    if (live) {
        fireAndForget(toggleConnection(connection, true, scope));

        return;
    }

    if (!DIALABLE[connection.transport]) {
        notify({
            detail: translate('transportPendingDetail'),
            title: translate('transportPendingTitle'),
            tone: 'warning',
        });

        return;
    }

    fireAndForget(toggleConnection(connection, false, scope));
}
