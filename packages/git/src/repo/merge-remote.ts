import type { GitError } from '../git/git-error.js';
import { run } from '../git/run.js';
import { pathsOf } from './paths-of.js';

/** What a merge left to answer: the paths git could not join by itself. */
export type MergeOutcome = { conflicted: string[] };

/**
 * Joins what the origin has into the branch and leaves the merge open: nothing is committed, so
 * the caller decides what each clash becomes before anything is written down. A merge that
 * stops on clashes is the normal way for two sides to have touched the same line, and answers
 * the paths; one that stops without any is a failure of git or of the disk, and throws.
 *
 * It is a merge and never a rebase: a rebase makes the person answer the same clash once for
 * every commit it replays.
 */
export async function mergeRemote(root: string): Promise<MergeOutcome> {
    let failure: GitError | null = null;

    try {
        await run(['merge', '--no-ff', '--no-commit', '@{u}'], root);
    } catch (error) {
        // `run` throws nothing but this: every failure of git is mapped to one.
        failure = error as GitError;
    }

    // A clash is not always a failure to the process that ran it: what the index says decides.
    const conflicted = await unmerged(root);

    if (failure !== null && conflicted.length === 0) {
        throw failure;
    }

    return { conflicted };
}

async function unmerged(root: string): Promise<string[]> {
    return pathsOf(await run(['diff', '--name-only', '--diff-filter=U', '-z'], root));
}
