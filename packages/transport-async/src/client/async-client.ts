import type { WsClientState } from './ws-client-state.js';
import type { WsMessage } from './ws-message.js';

/**
 * What the host sees of a socket, whatever protocol speaks underneath: the four operations and
 * the four reports. Both implementations — the raw websocket one and the Socket.IO one — promise
 * exactly this, so everything above opens, sends, closes and disposes without asking which one
 * is live.
 */
export type AsyncClient = {
    readonly state: WsClientState;
    open(): void;
    send(data: string, send?: AsyncClientSend): void;
    close(): void;
    dispose(): void;
};

/** What one emission carries besides the payload. The transports without names ignore it. */
export type AsyncClientSend = {
    event?: string | undefined;
    /** The wait for an answer: the identifier that links it, and how long it may take. */
    ack?: { id: string; timeoutMs: number } | undefined;
};

/** The four reports a client makes, by whatever name its protocol calls them. */
export type AsyncClientEvents = {
    onState: (state: WsClientState) => void;
    onMessage: (message: WsMessage) => void;
    onClose: (code: number, reason: string) => void;
    onError: (error: Error) => void;
};
