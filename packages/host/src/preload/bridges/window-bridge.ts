import {
    CHANNELS,
    emptyResultSchema,
    windowMaximizedPushSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * Chrome of the window: minimize, toggle maximize, close, popup the app menu. The maximized
 * push arrives validated; a push that does not parse is a bug in main, louder thrown.
 */
export function createWindowBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['window'] {
    return {
        minimize: () => call(CHANNELS.windowMinimize, emptyResultSchema),
        toggleMaximize: () => call(CHANNELS.windowToggleMaximize, emptyResultSchema),
        close: () => call(CHANNELS.windowClose, emptyResultSchema),
        onMaximizedChange: (handler) =>
            subscribe(ipc, CHANNELS.windowMaximized, (push) => {
                handler(windowMaximizedPushSchema.parse(push));
            }),
        popupAppMenu: (input) => call(CHANNELS.windowPopupMenu, emptyResultSchema, input),
        relaunch: () => call(CHANNELS.appRelaunch, emptyResultSchema),
        ready: () => call(CHANNELS.windowReady, emptyResultSchema),
    };
}
