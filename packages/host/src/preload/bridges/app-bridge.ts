import { appAboutResultSchema, CHANNELS, emptyResultSchema, type CoreBridge } from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** The app itself: who it is, the licenses it carries and the scheme its system parts take. */
export function createAppBridge(call: BridgeCall): CoreBridge['app'] {
    return {
        about: () => call(CHANNELS.appAbout, appAboutResultSchema),
        openLicenses: () => call(CHANNELS.appOpenLicenses, emptyResultSchema),
        configureAppearance: (input) =>
            call(CHANNELS.appearanceConfigure, emptyResultSchema, input),
    };
}
