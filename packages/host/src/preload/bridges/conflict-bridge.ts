import {
    CHANNELS,
    conflictChangedPushSchema,
    conflictListResultSchema,
    conflictReadResultSchema,
    emptyResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * The clashes the open origin keeps for a person: the list, one clash with its questions, the
 * two ways of closing one, and the push that says the list changed. The push arrives validated;
 * one that does not parse is a bug in main, louder thrown.
 */
export function createConflictBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['conflict'] {
    return {
        list: () => call(CHANNELS.conflictList, conflictListResultSchema),
        read: (input) => call(CHANNELS.conflictRead, conflictReadResultSchema, input),
        resolve: (input) => call(CHANNELS.conflictResolve, emptyResultSchema, input),
        keepMine: (input) => call(CHANNELS.conflictKeepMine, emptyResultSchema, input),
        onChanged: (handler) =>
            subscribe(ipc, CHANNELS.conflictChanged, (push) => {
                handler(conflictChangedPushSchema.parse(push));
            }),
    };
}
