import { claimStem, type FormatFile } from '@mandor/interop-core';
import type { ConcreteAuth, Connection } from '@mandor/schema';

import type { Directory } from './request-files.js';
import type { SavedMessages } from './saved-messages.js';
import { websocketDocumentOf } from './websocket-document.js';

/**
 * One file per WebSocket connection, named after it and numbered from `first`, the way Bruno
 * lists them. The connections of another transport have no file: Bruno has no Socket.IO request.
 */
export function websocketFilesOf(
    connections: readonly Connection[],
    place: {
        directory: Directory;
        first: number;
        inherited: ConcreteAuth | undefined;
        saved: SavedMessages;
    },
): FormatFile[] {
    const { directory, first, inherited, saved } = place;
    const prefix = directory.path === '' ? '' : `${directory.path}/`;

    return connections
        .filter((connection) => connection.transport === 'websocket')
        .map((connection, index) => ({
            path: `${prefix}${claimStem(connection.name, directory.taken, 'websocket')}.yml`,
            document: websocketDocumentOf(connection, {
                seq: first + index,
                inherited,
                messages: saved.get(connection.id),
            }),
        }));
}
