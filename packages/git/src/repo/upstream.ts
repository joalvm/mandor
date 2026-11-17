import { run } from '../git/run.js';

/** Whether the current branch follows a branch of the origin. */
export async function hasUpstream(root: string): Promise<boolean> {
    try {
        await run(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], root);

        return true;
    } catch {
        return false;
    }
}
