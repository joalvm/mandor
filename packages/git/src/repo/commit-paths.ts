import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { run } from '../git/run.js';
import { commitIn } from './ensure-identity.js';

/**
 * Saves only the paths a write touched, in one commit. Whatever else the tree holds stays
 * as the user left it: a neighbour being edited must never ride along under another's message.
 * Returns whether a commit was made — a write that changed nothing leaves no commit saying
 * it did.
 *
 * Git takes `.git/index.lock` for it and refuses a second writer that meets it there: the caller
 * runs the writes of one repo one at a time.
 */
export async function commitPaths(
    root: string,
    paths: string[],
    message: string,
): Promise<boolean> {
    const alive = await livePaths(root, paths);

    if (alive.length === 0) {
        return false;
    }

    await run(['add', '-A', '--', ...alive], root);

    const staged = await run(['diff', '--cached', '--name-only', '--', ...alive], root);

    if (staged === '') {
        return false;
    }

    await commitIn(root, ['-m', message, '--', ...alive]);

    return true;
}

/**
 * A path that is neither on disk nor in the index makes `add` fail with «pathspec did not
 * match»: a moved item hands over the path it left, which is gone from both once git has
 * already forgotten it. Those paths have nothing to commit and leave the list.
 */
async function livePaths(root: string, paths: string[]): Promise<string[]> {
    const alive: string[] = [];

    for (const path of paths) {
        if ((await onDisk(join(root, path))) || (await isTracked(root, path))) {
            alive.push(path);
        }
    }

    return alive;
}

async function isTracked(root: string, path: string): Promise<boolean> {
    return (await run(['ls-files', '--', path], root)) !== '';
}

function onDisk(path: string): Promise<boolean> {
    return access(path).then(
        () => true,
        () => false,
    );
}
