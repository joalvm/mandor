import { run } from '../git/run.js';

/** Whether the current branch has any commit: a clone of an empty remote has none yet. */
export async function hasCommits(root: string): Promise<boolean> {
    try {
        await run(['rev-parse', '--verify', 'HEAD'], root);

        return true;
    } catch {
        return false;
    }
}
