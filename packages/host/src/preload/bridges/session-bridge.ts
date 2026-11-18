import { CHANNELS, emptyResultSchema, sessionLoadResultSchema, type CoreBridge } from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/**
 * The session the window restores: load at start, save on change. A load that does not match
 * the renderer contract is refused here, not believed.
 */
export function createSessionBridge(call: BridgeCall): CoreBridge['session'] {
    return {
        load: () => call(CHANNELS.sessionLoad, sessionLoadResultSchema),
        save: (input) => call(CHANNELS.sessionSave, emptyResultSchema, input),
    };
}
