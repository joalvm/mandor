import { useMessages } from '@mandor/i18n';
import type { WsState, WsStatePush } from '@mandor/ipc';
import { selectTabShown, shellStore } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useEffect, useEffectEvent } from 'react';

import type { NewActivityEntry } from '../../../activity/activity-entry.js';
import { activityStore } from '../../../activity/activity-store.js';
import { asyncBridge } from '../../../app/async-bridge.js';
import { followComposerEventMoves } from '../../../events/follow-composer-event-moves.js';
import { registerOutboundPort } from '../../../outbound/outbound-registry.js';
import { connectionsStore } from '../connections-store.js';
import { selectConnections, selectConnectionStateFor } from '../selectors.js';
import { connectionOutbound } from '../lib/connection-outbound.js';
import { connectionFaultEntry } from '../lib/connection-fault-entry.js';
import { connectionStatusEntry } from '../lib/connection-status-entry.js';
import { messageEntry } from '../lib/connection-message-entry.js';
import { openConnection } from '../lib/open-connection.js';
import { openConnectionResource } from '../lib/open-connection-resource.js';
import { useWorkspaceScope } from './useWorkspaceScope.js';

/**
 * The line a state push writes on the timeline: a retry says why the attempt before it failed,
 * any other push says whether the socket came up or went down — or nothing, on the way there.
 */
function lineOfPush(push: WsStatePush, previous: WsState): NewActivityEntry | undefined {
    if (push.attempt !== undefined) {
        return connectionFaultEntry(push.reason);
    }

    return connectionStatusEntry(previous, push.state);
}

/**
 * The states a socket that was open lands on when it fell by itself. A close the reader asked for
 * goes through `closing` first, so it never reads as a fall.
 */
const FALLEN: ReadonlySet<WsState> = new Set<WsState>(['closed', 'error', 'reconnecting']);

function followSocketStates(onFallen: (connectionId: string) => void): () => void {
    return asyncBridge.ws.onState((push) => {
        const previous = selectConnectionStateFor(push.connectionId)(connectionsStore.getState());

        connectionsStore.getState().setConnectionState(push.connectionId, push.state, push.attempt);

        if (previous === 'open' && FALLEN.has(push.state)) {
            onFallen(push.connectionId);
        }

        const line = lineOfPush(push, previous);
        const resource = openConnectionResource(push.connectionId);

        if (line === undefined || resource === undefined) {
            return;
        }

        activityStore.getState().appendActivity(resource, [line]);
    });
}

function followRecordings(): () => void {
    return asyncBridge.record.onState((push) => {
        connectionsStore
            .getState()
            .setRecording(push.connectionId, { active: push.active, entries: push.entries });
    });
}

function followActivity(): () => void {
    return asyncBridge.ws.onActivity((push) => {
        const resource = openConnectionResource(push.connectionId);

        if (resource === undefined) {
            return;
        }

        activityStore.getState().appendActivity(
            resource,
            push.records.map((record) => messageEntry(record, push.environmentId)),
        );
    });
}

/**
 * Wires what main pushes about connections into the stores, and what this app sends through.
 * It lives with the kind — once per window, not per mounted panel — so a tab moved between
 * groups never loses its activity buffer.
 *
 * A socket that falls while its tab is behind another one is told in a notice that leads back to
 * it; with the tab in view the activity already says so, and a second voice would only repeat it.
 */
export function useConnectionPushes(): void {
    const { notify } = useToast();
    const messages = useMessages('connections');
    const scope = useWorkspaceScope();
    const announceFall = useEffectEvent((connectionId: string) => {
        const connection = selectConnections(connectionsStore.getState()).find(
            (each) => each.id === connectionId,
        );

        if (connection === undefined || selectTabShown(shellStore.getState(), connectionId)) {
            return;
        }

        notify({
            action:
                scope === null
                    ? undefined
                    : {
                          label: messages('seeActivity'),
                          onSelect: () => {
                              openConnection(connection, scope);
                          },
                      },
            // The same fall is one notice however many times the socket retries behind it.
            key: `dropped:${connectionId}`,
            title: messages('connectionDroppedTitle', { name: connection.name }),
            tone: 'warning',
        });
    });

    useEffect(() => {
        const stops = [
            followSocketStates(announceFall),
            followRecordings(),
            followActivity(),
            // A composer holds a file of the collection: renaming it is a rename, never a close.
            followComposerEventMoves(),
            // What this app can send through: the collection writes frames and never learns sockets.
            registerOutboundPort(connectionOutbound()),
        ];

        return () => {
            for (const stop of stops) {
                stop();
            }
        };
    }, []);
}
