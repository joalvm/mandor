import {
    CHANNELS,
    exportOutlineResultSchema,
    exportWriteResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** Exports of the workspace: the tree of what would leave, then the file it leaves in. */
export function createExportBridge(call: BridgeCall): CoreBridge['export'] {
    return {
        outline: (input) => call(CHANNELS.exportOutline, exportOutlineResultSchema, input),
        write: (input) => call(CHANNELS.exportWrite, exportWriteResultSchema, input),
    };
}
