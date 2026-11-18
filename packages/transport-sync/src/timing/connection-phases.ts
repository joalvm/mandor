import type { SyncNetwork } from '../response/sync-network.js';

/**
 * Where the connection time went, written by the connector while it connects. The durations
 * are the three phases apart: `lastPhaseEndAt` is the `performance.now()` mark of the phase
 * that finished last, so the first response byte counts from there. `alpnProtocol` says what
 * the socket negotiated: `'h2'` makes the response HTTP/2, anything else is HTTP/1.1.
 */
export type ConnectionPhases = {
    dnsMs: number;
    connectMs: number;
    tlsMs: number;
    /** `performance.now()` of the first response head; the caller writes it, the connector starts the clock. */
    firstByteAt: number;
    lastPhaseEndAt: number;
    alpnProtocol: string | null;
    /** Both ends of the socket that connected, and its handshake; null until one does. */
    network: SyncNetwork | null;
};
