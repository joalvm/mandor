import type { Unsubscribe } from '../bridge/core-bridge.js';
import type { Empty, Result } from '../result/result.js';
import type { WsActivityPush } from './ws-activity.js';
import type { WsCloseRequest } from './ws-close.js';
import type { WsOpenRequest } from './ws-open.js';
import type { WsRetryNowRequest } from './ws-retry-now.js';
import type { WsScriptNote } from './ws-script-note.js';
import type { WsSendRequest } from './ws-send.js';
import type { WsStatePush } from './ws-state.js';

/**
 * The sockets of one window: open, send, close and retry, and what main pushes as each one
 * lives. Only Async serves it, so it sits beside its channels and not in the core.
 */
export type WsArea = {
    open: (input: WsOpenRequest) => Promise<Result<Empty>>;
    send: (input: WsSendRequest) => Promise<Result<Empty>>;
    close: (input: WsCloseRequest) => Promise<Result<Empty>>;
    retryNow: (input: WsRetryNowRequest) => Promise<Result<Empty>>;
    onState: (handler: (push: WsStatePush) => void) => Unsubscribe;
    onActivity: (handler: (push: WsActivityPush) => void) => Unsubscribe;
    /** What the scripts of a connection said, as main pushes it. */
    onScriptNote: (handler: (note: WsScriptNote) => void) => Unsubscribe;
};
