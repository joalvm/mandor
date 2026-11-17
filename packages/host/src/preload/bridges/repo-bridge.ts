import {
    CHANNELS,
    conflictRecordedPushSchema,
    repoChangedPushSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * What the window hears about the repo that it did not do itself. Both pushes arrive
 * validated; one that does not parse is a bug in main, louder thrown.
 */
export function createRepoBridge(ipc: BridgeIpc): CoreBridge['repo'] {
    return {
        onChanged: (handler) =>
            subscribe(ipc, CHANNELS.repoChanged, (push) => {
                handler(repoChangedPushSchema.parse(push));
            }),
        onConflictRecorded: (handler) =>
            subscribe(ipc, CHANNELS.conflictRecorded, (push) => {
                handler(conflictRecordedPushSchema.parse(push));
            }),
    };
}
