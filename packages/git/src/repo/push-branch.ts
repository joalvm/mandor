import { run, runNetwork } from '../git/run.js';
import type { NetworkAccess } from '../git/network-access.js';
import { hasUpstream } from './upstream.js';

/**
 * Sends the current branch to the origin under its own name. The first push of a branch also
 * makes it follow the origin. A branch the origin moved on since the last fetch is refused by
 * the origin itself: nothing here asks for more.
 */
export async function pushBranch(root: string, access: NetworkAccess): Promise<void> {
    const branch = await run(['rev-parse', '--abbrev-ref', 'HEAD'], root);
    const refspec = `${branch}:${branch}`;
    const args = (await hasUpstream(root))
        ? ['push', 'origin', refspec]
        : ['push', '-u', 'origin', refspec];

    await runNetwork(args, root, access);
}
