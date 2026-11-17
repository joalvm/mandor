import { runNetwork } from '../git/run.js';
import type { NetworkAccess } from '../git/network-access.js';

/** Brings what the origin has into the remote-tracking refs and touches nothing of the work. */
export async function fetchRemote(root: string, access: NetworkAccess): Promise<void> {
    await runNetwork(['fetch', 'origin'], root, access);
}
