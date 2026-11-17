import { CHANNELS, emptyResultSchema, type CoreBridge } from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** The line a fault of the window hands main to write: the one thing the log lets in. */
export function createLogBridge(call: BridgeCall): CoreBridge['log'] {
    return {
        write: (input) => call(CHANNELS.logWrite, emptyResultSchema, input),
    };
}
