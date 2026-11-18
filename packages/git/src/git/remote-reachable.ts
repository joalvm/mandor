import { runNetwork } from './run.js';
import type { NetworkAccess } from './network-access.js';

/**
 * Asks an origin for its refs and nothing more: the cheapest question that proves the url
 * answers. A failure maps to the same codes as any other git call.
 */
export async function remoteReachable(access: NetworkAccess): Promise<void> {
    await runNetwork(['ls-remote', '--', access.url], null, access);
}
