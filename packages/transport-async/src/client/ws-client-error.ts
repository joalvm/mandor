import type { WsClientState } from './ws-client-state.js';

/** An operation asked of a client whose state cannot serve it, like sending before open. */
export class WsClientError extends Error {
    constructor(
        readonly operation: 'open' | 'send',
        readonly state: WsClientState,
    ) {
        super(`cannot ${operation} while the socket is ${state}`);
        this.name = 'WsClientError';
    }
}
