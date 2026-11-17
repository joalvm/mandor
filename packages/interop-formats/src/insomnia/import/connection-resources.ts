import { socketResources, type ImportResource } from '@mandor/interop-core';

import type {
    InsomniaDocument,
    InsomniaFolder,
    InsomniaNode,
    InsomniaWebSocket,
} from '../document/insomnia-tree.js';
import { websocketResourceOf } from './websocket-connection.js';

function isSocket(node: InsomniaNode): node is InsomniaWebSocket {
    return node.kind === 'websocket';
}

function isFolder(node: InsomniaNode): node is InsomniaFolder {
    return node.kind === 'folder';
}

/** The WebSocket requests at any depth: a connection hangs from the workspace, not from a folder. */
function socketsIn(nodes: readonly InsomniaNode[]): InsomniaWebSocket[] {
    const inside = nodes.filter(isFolder).flatMap((folder) => socketsIn(folder.children));

    return [...nodes.filter(isSocket), ...inside];
}

/**
 * One connection per WebSocket request of every collection of the import. Connections share one
 * directory, so one id each, across the collections: two of the same name stay two.
 */
export function connectionResourcesOf(documents: readonly InsomniaDocument[]): ImportResource[] {
    return socketResources(
        documents.map(({ sourceId, children }) => ({ sourceId, sockets: socketsIn(children) })),
        websocketResourceOf,
    );
}
