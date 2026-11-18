import { runNetwork } from '../git/run.js';
import type { NetworkAccess } from '../git/network-access.js';

/**
 * Brings the whole repo of an origin to `dest`, which must not exist yet. A remote with nothing
 * in it clones as an empty repo, and what to do with that is the caller's to decide.
 */
export async function cloneRepo(access: NetworkAccess, dest: string): Promise<void> {
    await runNetwork(['clone', '--', access.url, dest], null, access);
}
