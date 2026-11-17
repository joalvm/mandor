import { socketResources, type ImportResource } from '@mandor/interop-core';

import type {
    BrunoDocument,
    BrunoFolder,
    BrunoNode,
    BrunoWebSocket,
} from '../document/bruno-tree.js';
import { isWebSocket } from './is-websocket.js';
import { websocketResourceOf } from './websocket-connection.js';

function isFolder(node: BrunoNode): node is BrunoFolder {
    return node.kind === 'folder';
}

/** The WebSocket requests at any depth: a connection hangs from the workspace, not from a folder. */
function socketsIn(nodes: readonly BrunoNode[]): BrunoWebSocket[] {
    const inside = nodes.filter(isFolder).flatMap((folder) => socketsIn(folder.children));

    return [...nodes.filter(isWebSocket), ...inside];
}

/**
 * One connection per WebSocket request of every collection of the import. Connections share one
 * directory, so one id each, across the collections: two of the same name stay two.
 */
export function connectionResourcesOf(documents: readonly BrunoDocument[]): ImportResource[] {
    return socketResources(
        documents.map(({ sourceId, children }) => ({ sourceId, sockets: socketsIn(children) })),
        websocketResourceOf,
    );
}
