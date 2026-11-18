import { session } from 'electron';

import { readSecret } from '../origin/secret-store.js';
import { networkFor, type NetworkFor } from './network-for.js';

/**
 * The network of this machine as both apps dial it: the proxy the session of Electron resolves
 * (the settings and the PAC of the system), the environment of the process, and the secrets of
 * the keychain.
 */
export function systemNetworkFor(userDataDir: string): NetworkFor {
    return networkFor({
        userDataDir,
        resolveProxy: (url) => session.defaultSession.resolveProxy(url),
        env: process.env,
        // A machine without a keychain kept no secret: nothing to unseal, so the dial asks none.
        readSecret: (key) => readSecret(userDataDir, key).catch(() => null),
    });
}
