import type { ConnectionTransport } from './connection-transport.js';

const TO_WEBSOCKET: Record<string, string> = {
    'http://': 'ws://',
    'https://': 'wss://',
};

const TO_SOCKET_IO: Record<string, string> = {
    'ws://': 'http://',
    'wss://': 'https://',
};

/** The plain/secure pairs each transport rewrites, from the scheme found to the one it dials. */
const SCHEMES_OF_TRANSPORT: Record<ConnectionTransport, Record<string, string>> = {
    websocket: TO_WEBSOCKET,
    socketio: TO_SOCKET_IO,
};

/**
 * The url rewritten to the scheme the transport dials, or the same url when it already speaks
 * it — or speaks nothing the transport knows. Changing transport never invents a host; it only
 * moves the url across the plain/secure pair it belongs to.
 */
export function urlForTransport(url: string, transport: ConnectionTransport): string {
    const schemes = Object.entries(SCHEMES_OF_TRANSPORT[transport]);
    const found = schemes.find(([scheme]) => url.startsWith(scheme));

    if (found === undefined) {
        return url;
    }

    const [prefix, replacement] = found;

    return `${replacement}${url.slice(prefix.length)}`;
}
