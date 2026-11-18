import { run } from '../git/run.js';

/** Gives the tree back as it was before the merge opened: nothing of it is left half done. */
export async function abortMerge(root: string): Promise<void> {
    await run(['merge', '--abort'], root);
}
