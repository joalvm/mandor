import type { ConnectionTransport } from '@mandor/schema';

/** The message key each transport names itself with. */
export const TRANSPORT_LABELS: Record<
    ConnectionTransport,
    'transportSocketio' | 'transportWebsocket'
> = {
    socketio: 'transportSocketio',
    websocket: 'transportWebsocket',
};
