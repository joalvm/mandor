import { run } from '../git/run.js';
import { hasUpstream } from './upstream.js';

/** How far the work and the origin have gone apart, in commits. */
export type AheadBehind = { ahead: number; behind: number };

/**
 * Counts what each side has that the other lacks. A branch the origin has never heard of is all
 * ahead: every commit it has is one the origin does not.
 */
export async function aheadBehind(root: string): Promise<AheadBehind> {
    if (!(await hasUpstream(root))) {
        return { ahead: await localCommits(root), behind: 0 };
    }

    const counts = await run(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], root);
    const [ahead, behind] = counts.split(/\s+/);

    return { ahead: Number(ahead), behind: Number(behind) };
}

/** A repo with no commit yet has no HEAD to count from, and that is zero. */
async function localCommits(root: string): Promise<number> {
    try {
        return Number(await run(['rev-list', '--count', 'HEAD'], root));
    } catch {
        return 0;
    }
}
