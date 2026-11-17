/**
 * The system names a proxy neither transport speaks — a QUIC entry of a PAC answer. The send
 * fails instead of going direct: a network that demanded a proxy would be skipped in silence.
 */
export class UnsupportedProxyError extends Error {
    constructor(kind: string) {
        super(`the system proxy ${kind} is not supported`);
        this.name = 'UnsupportedProxyError';
    }
}
