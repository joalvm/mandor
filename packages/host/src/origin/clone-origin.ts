import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
    cloneRepo,
    hasCommits,
    initRepo as initGitRepo,
    nameFirstBranch,
    pushBranch,
    type NetworkAccess,
} from '@mandor/git';
import { renameWithRetry, writeRepoTree } from '@mandor/store-fs';

import { OriginForeignError } from './origin-foreign-error.js';
import type { StoredOrigin } from './stored-origin.js';

/** Mandor names the first branch of a repo it starts: what git defaults to varies by machine. */
const FIRST_BRANCH = 'main';

/**
 * Brings the work of a remote origin to this machine. The copy is built beside its final place
 * and moved in only when whole, so a failure never leaves a half copy that would be taken for
 * the real one. An origin with nothing in it is started as an empty repo and published; one
 * that holds anything but an Mandor repo is refused, because mixing in somebody else's files
 * would put them under Mandor's commits.
 */
export async function cloneOrigin(origin: StoredOrigin, access: NetworkAccess): Promise<void> {
    const partial = `${origin.root}.partial`;

    await rm(partial, { force: true, recursive: true });
    await mkdir(dirname(partial), { recursive: true });

    try {
        await cloneRepo(access, partial);
        await settle(origin, access, partial);
        await renameWithRetry(partial, origin.root);
    } catch (error) {
        await rm(partial, { force: true, recursive: true });

        throw error;
    }
}

async function settle(origin: StoredOrigin, access: NetworkAccess, dir: string): Promise<void> {
    if (await hasCommits(dir)) {
        await assertMandorRepo(access.url, dir);

        return;
    }

    await nameFirstBranch(dir, FIRST_BRANCH);
    await writeRepoTree(dir, origin.name);
    await initGitRepo(dir);
    await pushBranch(dir, access);
}

async function assertMandorRepo(url: string, dir: string): Promise<void> {
    const found = await stat(join(dir, 'mandor.yaml')).then(
        () => true,
        () => false,
    );

    if (!found) {
        throw new OriginForeignError(url);
    }
}
