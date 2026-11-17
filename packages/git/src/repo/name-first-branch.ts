import { run } from '../git/run.js';

/**
 * Names the branch a repo with no commit will be born on. A clone of an empty remote takes
 * whatever default that machine has; Mandor names the branch itself so every copy agrees.
 */
export async function nameFirstBranch(root: string, branch: string): Promise<void> {
    await run(['symbolic-ref', 'HEAD', `refs/heads/${branch}`], root);
}
