import { commitMessage, commitPaths, type RepoChange } from '@mandor/git';
import { inTurn } from '@mandor/store-fs';

import { trackWrite } from '../runtime/write-drain.js';
import { announceCommitted } from './commit-events.js';
import { flushCommits } from './commit-scheduler.js';
import { rememberDisk } from './remember-disk.js';

/**
 * Every path the change touches, the ones it leaves as much as the ones it lands on. A change
 * whose paths only exist once it is done — a workspace takes its id from what was made — names
 * them from the answer of the work.
 */
export type ReshapeRepoRequest<T = unknown> = {
    root: string;
    paths: string[] | ((result: T) => string[]);
    change: RepoChange;
};

/**
 * The door for a change of structure — create, rename, move, delete, import, empty: the work
 * and its commit happen in the act. It touches several paths at once, and a commit waiting on a
 * path that just moved would be left with a pathspec that matches nothing.
 *
 * What was waiting for the calm is committed first, under its own message, so the history reads
 * in the order the user acted.
 */
export function reshapeRepo<T>(request: ReshapeRepoRequest<T>, work: () => Promise<T>): Promise<T> {
    return trackWrite(reshape(request, work));
}

async function reshape<T>(request: ReshapeRepoRequest<T>, work: () => Promise<T>): Promise<T> {
    const { root, paths, change } = request;

    await flushCommits(root);

    return inTurn(root, async () => {
        const result = await work();
        const touched = typeof paths === 'function' ? paths(result) : paths;

        await rememberDisk(root, touched);

        if (await commitPaths(root, touched, commitMessage(change))) {
            announceCommitted(root);
        }

        return result;
    });
}
