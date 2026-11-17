/**
 * The life of one socket. The literals match the `WsState` contract of `@mandor/ipc` on
 * purpose, so a state push crosses the bridge without mapping — but this package does not
 * import the contract: traffic stays traffic.
 */
export type WsClientState =
    'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error' | 'reconnecting';
