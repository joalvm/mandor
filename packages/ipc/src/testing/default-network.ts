import { DEFAULT_NETWORK_SETTINGS } from '@mandor/schema';

import type { NetworkArea } from '../bridge/network-area.js';
import { success } from '../result/success.js';

/** The network area a test gets when it says nothing about the network: the defaults, kept nowhere. */
export function defaultNetwork(): NetworkArea {
    return {
        read: () =>
            Promise.resolve(
                success({
                    settings: DEFAULT_NETWORK_SETTINGS,
                    kept: { proxyPassword: false, passphrases: [] },
                }),
            ),
        write: () => Promise.resolve(success({})),
        setSecret: () => Promise.resolve(success({})),
        chooseFile: () => Promise.resolve(success(null)),
    };
}
