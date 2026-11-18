import {
    CHANNELS,
    emptyResultSchema,
    originAddResultSchema,
    originCheckResultSchema,
    originListResultSchema,
    originRenameResultSchema,
    originStatePushSchema,
    originStateResultSchema,
    originSwitchResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * The origin is the only bridge word the user ever sees. Add, check, empty, list, remove,
 * rename and switch, one channel each; and the state of its synchronization, read and heard.
 */
export function createOriginBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['origin'] {
    return {
        add: (input) => call(CHANNELS.originAdd, originAddResultSchema, input),
        check: (input) => call(CHANNELS.originCheck, originCheckResultSchema, input),
        empty: (input) => call(CHANNELS.originEmpty, emptyResultSchema, input),
        list: () => call(CHANNELS.originList, originListResultSchema),
        remove: (input) => call(CHANNELS.originRemove, emptyResultSchema, input),
        rename: (input) => call(CHANNELS.originRename, originRenameResultSchema, input),
        switch: (input) => call(CHANNELS.originSwitch, originSwitchResultSchema, input),
        state: () => call(CHANNELS.originState, originStateResultSchema),
        onStateChanged: (handler) =>
            subscribe(ipc, CHANNELS.originStateChanged, (push) => {
                handler(originStatePushSchema.parse(push));
            }),
    };
}
