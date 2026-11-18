import type { NetworkSettings } from '@mandor/schema';

import type { NetworkFilePurpose, NetworkSecretRequest } from '../network/network-secret.js';
import type { NetworkState } from '../network/network-state.js';
import type { Empty, Result } from '../result/result.js';

/**
 * How the requests of the app reach the network: the proxy, the authorities it trusts and the
 * certificates it shows. A path only ever comes from the open dialog of the system, and a
 * secret only ever goes towards the keychain.
 */
export type NetworkArea = {
    read: () => Promise<Result<NetworkState>>;
    write: (settings: NetworkSettings) => Promise<Result<Empty>>;
    setSecret: (input: NetworkSecretRequest) => Promise<Result<Empty>>;
    chooseFile: (purpose: NetworkFilePurpose) => Promise<Result<string | null>>;
};
