import {
    CHANNELS,
    emptyResultSchema,
    secretKeptResultSchema,
    secretRevealResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/**
 * Secrets of the environment. The value itself never crosses the bridge twice: `set` and
 * `clear` take it, `kept` answers whether it exists, and only `reveal` brings it back.
 */
export function createSecretBridge(call: BridgeCall): CoreBridge['secret'] {
    return {
        set: (input) => call(CHANNELS.secretSet, emptyResultSchema, input),
        clear: (input) => call(CHANNELS.secretClear, emptyResultSchema, input),
        reveal: (input) => call(CHANNELS.secretReveal, secretRevealResultSchema, input),
        kept: (input) => call(CHANNELS.secretKept, secretKeptResultSchema, input),
    };
}
