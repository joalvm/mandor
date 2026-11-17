/**
 * Where the time of a request went, as durations in milliseconds (never marks, so a log line
 * can compare two requests directly). DNS, TCP and TLS come from the timed connector; TLS is
 * zero on plain `http:`. `firstByteMs` runs from the end of TLS (or of TCP on `http:`) to the
 * first response header; `totalMs` covers the whole send, redirects included. `viaProxy` is
 * true when a proxy answered and the phases could not be measured through it.
 */
export type SyncTimings = {
    dnsMs: number;
    connectMs: number;
    tlsMs: number;
    firstByteMs: number;
    totalMs: number;
    viaProxy: boolean;
};
