import {
    CHANNELS,
    emptyResultSchema,
    menuEditPushSchema,
    menuSettingsPushSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';
import type { BridgeIpc } from '../bridge-ipc.js';
import { subscribe } from '../subscribe.js';

/**
 * The menu, both ways: the renderer says which language it speaks, the Edit menu hands the
 * window the step of the history to take, and the Settings entry asks it to open its dialog. A
 * push that does not parse is a bug in main, louder thrown.
 */
export function createMenuBridge(call: BridgeCall, ipc: BridgeIpc): CoreBridge['menu'] {
    return {
        speak: (input) => call(CHANNELS.menuLanguage, emptyResultSchema, input),
        onEditStep: (handler) =>
            subscribe(ipc, CHANNELS.menuEdit, (push) => {
                handler(menuEditPushSchema.parse(push));
            }),
        onSettings: (handler) =>
            subscribe(ipc, CHANNELS.menuSettings, (push) => {
                menuSettingsPushSchema.parse(push);
                handler();
            }),
    };
}
