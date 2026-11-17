import type { WsState } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';

import type {
    OutboundFrame,
    OutboundPort,
    OutboundTarget,
} from '../../../outbound/outbound-port.js';
import { connectionsStore } from '../connections-store.js';

import { openSocket } from './open-socket.js';
import { frameTemplateOf } from './connection-settings.js';
import { sendMessage } from './send-message.js';

/** A socket on its way up is as good as one that is up: what is sent through it will go. */
function isLive(state: WsState | undefined): boolean {
    return state === 'open' || state === 'connecting';
}

function listTargets(): OutboundTarget[] {
    const { connections, states } = connectionsStore.getState();
    const targets = connections.map((connection) => ({
        // Nobody above the connection: the one that chose none resolves nothing.
        environmentId: connection.environmentId,
        id: connection.id,
        live: isLive(states[connection.id]),
        name: connection.name,
    }));

    return [...targets.filter((each) => each.live), ...targets.filter((each) => !each.live)];
}

function subscribeTargets(listener: () => void): () => void {
    return connectionsStore.subscribe(() => {
        listener();
    });
}

async function sendThrough(targetId: string, frame: OutboundFrame): Promise<void> {
    const connection = connectionsStore.getState().connections.find((each) => each.id === targetId);
    const workspaceId = shellStore.getState().activeWorkspaceId;

    if (connection === undefined || workspaceId === null) {
        return;
    }

    const live = isLive(connectionsStore.getState().states[targetId]);

    // Choosing a connection that is down is choosing to open it, and a socket that never came
    // up has nowhere to put the frame: the refusal is already on the connection.
    if (!live && !(await openSocket(connection, { workspaceId }))) {
        return;
    }

    const envelope = frameTemplateOf(connection);

    await sendMessage({
        connectionId: targetId,
        origin: frame.origin,
        itemPath: frame.itemPath,
        template: frame.template,
        workspaceId,
        ...(frame.schema === undefined ? {} : { schema: frame.schema }),
        ...(envelope === undefined ? {} : { frame: envelope }),
    });
}

/**
 * How a frame written anywhere in this app reaches a socket. The feature that wrote it never
 * learns what a connection is, and this one never learns what wrote the frame.
 */
export function connectionOutbound(): OutboundPort {
    return { send: sendThrough, subscribe: subscribeTargets, targets: listTargets };
}
