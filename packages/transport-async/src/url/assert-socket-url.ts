import { SocketUrlError } from './socket-url-error.js';

/** The transports a connection of this app dials, and the schemes each one speaks. */
export type SocketTransport = 'websocket' | 'socketio';

const SCHEMES: Record<SocketTransport, readonly string[]> = {
    socketio: ['http:', 'https:'],
    websocket: ['ws:', 'wss:'],
};

/**
 * The single gate between user input and a dial. Each transport only accepts the schemes it
 * speaks — a websocket dials ws(s), Socket.IO dials http(s) — and anything else (`file:`,
 * `javascript:`) never touches a socket. An empty host never survives the parse: both schemes of
 * each transport are special, so the WHATWG parser itself throws. The url is not repaired: a user
 * who typed the wrong scheme sees an error.
 */
export function assertSocketUrl(transport: SocketTransport, value: string): URL {
    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new SocketUrlError(`refused a ${transport} URL that does not parse`);
    }

    if (!SCHEMES[transport].includes(url.protocol)) {
        throw new SocketUrlError(`refused the scheme ${url.protocol} for ${transport}`);
    }

    return url;
}
