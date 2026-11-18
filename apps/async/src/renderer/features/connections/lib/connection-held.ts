import { asyncBridge } from '../../../app/async-bridge.js';

/**
 * Whether the workspace still holds the connection a link names. It asks main by listing,
 * because a link can name a workspace whose connections this window has not loaded yet.
 */
export async function connectionHeld(workspaceId: string, connectionId: string): Promise<boolean> {
    const connections = await asyncBridge.connection.list({ workspaceId });

    return connections.ok && connections.value.some((connection) => connection.id === connectionId);
}
