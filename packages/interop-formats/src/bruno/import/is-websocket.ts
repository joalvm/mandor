import type { BrunoNode, BrunoWebSocket } from '../document/bruno-tree.js';

/** Tells a WebSocket request from the folders and the HTTP requests of the tree. */
export function isWebSocket(node: BrunoNode): node is BrunoWebSocket {
    return node.kind === 'websocket';
}
