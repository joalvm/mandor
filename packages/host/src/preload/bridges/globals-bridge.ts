import {
    CHANNELS,
    type CoreBridge,
    globalsReadResultSchema,
    globalsWriteResultSchema,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** The globals of the active origin: read the list, and write it back whole. */
export function createGlobalsBridge(call: BridgeCall): CoreBridge['globals'] {
    return {
        read: (input) => call(CHANNELS.globalsRead, globalsReadResultSchema, input),
        write: (input) => call(CHANNELS.globalsWrite, globalsWriteResultSchema, input),
    };
}
