import {
    CHANNELS,
    authReadResultSchema,
    authTokenStatusResultSchema,
    emptyResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** Read, write and chain the auth of the active origin, per level, and govern its token. */
export function createAuthBridge(call: BridgeCall): CoreBridge['auth'] {
    return {
        read: (input) => call(CHANNELS.authRead, authReadResultSchema, input),
        write: (input) => call(CHANNELS.authWrite, emptyResultSchema, input),
        tokenStatus: (input) => call(CHANNELS.authTokenStatus, authTokenStatusResultSchema, input),
        tokenFetch: (input) => call(CHANNELS.authTokenFetch, authTokenStatusResultSchema, input),
        tokenForget: (input) => call(CHANNELS.authTokenForget, emptyResultSchema, input),
    };
}
