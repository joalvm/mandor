import { CHANNELS, noticeListResultSchema, noticePushSchema, type CoreBridge } from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * What main has to say that nobody asked for: the list of what it raised before the window
 * listened, and the push of what it raises next. The push arrives validated; one that does not
 * parse is a bug in main, louder thrown.
 */
export function createNoticeBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['notice'] {
    return {
        list: () => call(CHANNELS.noticeList, noticeListResultSchema),
        onRaised: (handler) =>
            subscribe(ipc, CHANNELS.noticeRaised, (push) => {
                handler(noticePushSchema.parse(push));
            }),
    };
}
