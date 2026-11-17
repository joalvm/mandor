import type { ComponentType } from 'react';
import type { ConnectionTransport } from '@mandor/schema';

import { SocketIoLogo } from './SocketIoLogo.js';
import { WebsocketLogo } from './WebsocketLogo.js';

type TransportLogoProps = {
    transport: ConnectionTransport;
};

/** The logo of each transport, drawn by its own house, and the hue it wears in this window. */
const LOGOS: Record<ConnectionTransport, ComponentType<{ className?: string }>> = {
    socketio: SocketIoLogo,
    websocket: WebsocketLogo,
};

const HUES: Record<ConnectionTransport, string> = {
    socketio: 'text-text-pink',
    websocket: 'text-text-iris',
};

/**
 * The logo of a transport, in the hue this window gives it. The record is keyed by the
 * transport union, so the transports that arrive later — gRPC, MQTT, SSE — bring their logo
 * and their hue with them.
 */
export function TransportLogo({ transport }: TransportLogoProps) {
    const Logo = LOGOS[transport];

    return (
        <span
            aria-hidden="true"
            className={`inline-flex size-icon-md shrink-0 items-center justify-center ${HUES[transport]}`}
            data-part="transport-logo"
        >
            <Logo className="size-full" />
        </span>
    );
}
