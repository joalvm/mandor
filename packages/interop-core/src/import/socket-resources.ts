import type { ImportResource } from '../resource/import-resource.js';
import { slugFor } from './claim-route.js';
import { nameOr } from './resource-parts.js';

/** The WebSocket requests one collection of an import holds, and the file they came from. */
export type SocketsOfSource<Socket> = { sourceId: string; sockets: readonly Socket[] };

/**
 * One connection per WebSocket request of every collection of the import. Connections share one
 * directory, so one id each, across the collections: two of the same name stay two.
 */
export function socketResources<Socket extends { name: string }>(
    sources: readonly SocketsOfSource<Socket>[],
    resourceOf: (socket: Socket, sourceId: string, route: string) => ImportResource,
): ImportResource[] {
    const taken: string[] = [];

    return sources.flatMap((source) =>
        source.sockets.map((socket) => {
            const name = nameOr(socket.name, 'WebSocket');
            const route = slugFor(name, taken, 'websocket');

            taken.push(route);

            return resourceOf({ ...socket, name }, source.sourceId, route);
        }),
    );
}
