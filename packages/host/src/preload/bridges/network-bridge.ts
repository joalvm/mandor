import {
    CHANNELS,
    emptyResultSchema,
    networkChooseFileResultSchema,
    networkReadResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/**
 * The network settings: read whole, written whole, a secret towards the keychain and a file
 * through the dialog of the system.
 */
export function createNetworkBridge(call: BridgeCall): CoreBridge['network'] {
    return {
        read: () => call(CHANNELS.networkRead, networkReadResultSchema),
        write: (settings) => call(CHANNELS.networkWrite, emptyResultSchema, settings),
        setSecret: (input) => call(CHANNELS.networkSecret, emptyResultSchema, input),
        chooseFile: (purpose) =>
            call(CHANNELS.networkChooseFile, networkChooseFileResultSchema, { purpose }),
    };
}
