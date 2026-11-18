import {
    CHANNELS,
    emptyResultSchema,
    importApplyResultSchema,
    importPickResultSchema,
    importPlanBuildResultSchema,
    importProgressPushSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * Importing a document: pick the files, build the difference first, write the accepted plan once;
 * and the push of how the read goes, with the way to stop it.
 */
export function createImportBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['import'] {
    return {
        plan: (input) => call(CHANNELS.importPlanBuild, importPlanBuildResultSchema, input),
        apply: (input) => call(CHANNELS.importApply, importApplyResultSchema, input),
        pick: (input) => call(CHANNELS.importPick, importPickResultSchema, input),
        cancel: () => call(CHANNELS.importCancel, emptyResultSchema),
        onProgress: (handler) =>
            subscribe(ipc, CHANNELS.importProgress, (push) => {
                handler(importProgressPushSchema.parse(push));
            }),
    };
}
