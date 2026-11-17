/** The transports an async connection can use, in the order the picker offers them. */
export const CONNECTION_TRANSPORTS = ['websocket', 'socketio'] as const;

export type ConnectionTransport = (typeof CONNECTION_TRANSPORTS)[number];

/** The transport a connection starts with when nobody chose one. */
export const DEFAULT_CONNECTION_TRANSPORT: ConnectionTransport = 'websocket';
