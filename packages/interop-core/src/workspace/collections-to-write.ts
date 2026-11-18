import type { WorkspaceCollectionSource, WorkspaceData } from './workspace-data.js';

/**
 * The collections a format writes. A workspace that has environments, variables or WebSocket
 * connections but no collection still has to leave them somewhere: a format that keeps them
 * inside a collection gets one empty collection named after the workspace to carry them.
 */
export function collectionsToWrite(data: WorkspaceData): readonly WorkspaceCollectionSource[] {
    const carries =
        data.environments.length > 0 ||
        data.globals.length > 0 ||
        data.connections.some((connection) => connection.transport === 'websocket');

    if (data.collections.length === 0 && carries) {
        return [
            {
                name: data.name,
                settings: { variables: [], headers: [] },
                folders: [],
                items: [],
            },
        ];
    }

    return data.collections;
}
