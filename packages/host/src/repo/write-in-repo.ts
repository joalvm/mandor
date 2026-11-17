import type { RepoChange } from '@mandor/git';
import { inTurn } from '@mandor/store-fs';

import { trackWrite } from '../runtime/write-drain.js';
import { scheduleCommit } from './commit-scheduler.js';

/**
 * Where an edit landed and how its commit will read. `path` is relative to the repo root. The
 * change may still be on its way: a name read from disk is started beside the work and awaited
 * after it, because an await ahead of the turn lets a later request queue first.
 */
export type WriteInRepoRequest = {
    root: string;
    path: string;
    change: RepoChange | Promise<RepoChange>;
};

/**
 * The door for editing the content of one entity: the work runs in the turn of the repo and the
 * commit of its path is left for after the calm. A pause in the work is one commit, whatever
 * the number of saves it held, and what the work wrote is the only thing that commit holds.
 *
 * The work is held where the exit can wait for it: an edit that arrives as the window goes away
 * has to land before the process does. Work that failed schedules nothing: whatever it half wrote is not a change worth a commit,
 * and the error reaches the caller as it left the work.
 */
export async function writeInRepo<T>(
    request: WriteInRepoRequest,
    work: () => Promise<T>,
): Promise<T> {
    // The turn of the repo is also what keeps two git writes apart: git takes `.git/index.lock`
    // for every commit, restore or merge and refuses a second writer.
    const result = await trackWrite(inTurn(request.root, work));

    scheduleCommit({
        root: request.root,
        key: request.path,
        paths: [request.path],
        change: await request.change,
    });

    return result;
}
