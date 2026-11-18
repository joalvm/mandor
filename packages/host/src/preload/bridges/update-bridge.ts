import {
    CHANNELS,
    emptyResultSchema,
    updateStateResultSchema,
    updateStateSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * The updates: the state main keeps, what the person asks for, and the push of every change. A
 * push arrives validated; one that does not parse is a bug in main, louder thrown.
 */
export function createUpdateBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['update'] {
    return {
        state: () => call(CHANNELS.updateState, updateStateResultSchema),
        configure: (input) => call(CHANNELS.updateConfigure, emptyResultSchema, input),
        check: () => call(CHANNELS.updateCheck, emptyResultSchema),
        download: () => call(CHANNELS.updateDownload, emptyResultSchema),
        install: () => call(CHANNELS.updateInstall, emptyResultSchema),
        openPage: () => call(CHANNELS.updateOpenPage, emptyResultSchema),
        onChanged: (handler) =>
            subscribe(ipc, CHANNELS.updateChanged, (push) => {
                handler(updateStateSchema.parse(push));
            }),
    };
}
