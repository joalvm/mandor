import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll } from 'vitest';

import { run } from '../../src/git/run.js';
import { cloneRepo } from '../../src/repo/clone-repo.js';
import { commitAll } from '../../src/repo/commit-all.js';
import { initRepo } from '../../src/repo/init-repo.js';

import { copiedRepo, createRepo, removeRepo, type Repo } from './repo.js';

/** A git url for a bare repo on disk: the suite talks to a remote without opening a socket. */
export function urlOf(repo: Repo): string {
    return repo.remote;
}

/** Writes one file in a working copy and commits it, the way the app does after a write. */
export async function commitFile(
    root: string,
    name: string,
    text: string,
    message: string,
): Promise<void> {
    await writeFile(join(root, name), text, 'utf8');
    await commitAll(root, message);
}

/** A repo with the origin it will push to, and one commit already on that origin. */
export async function publishedRepo(): Promise<Repo> {
    const repo = await createRepo();

    await initRepo(repo.root);
    await run(['remote', 'add', 'origin', urlOf(repo)], repo.root);
    await commitFile(repo.root, 'mandor.yaml', 'name: Mi repo\n', 'update mandor.yaml');
    await run(['push', '-u', 'origin', 'main'], repo.root);

    return repo;
}

/**
 * A published repo for every test of a file: built once before the first test, and copied for
 * each, so a test runs git for what it does and not for the stage it starts on. Called at the top
 * of the file, where hooks register.
 */
export function publishedRepos(): () => Promise<Repo> {
    let built: Repo | null = null;

    beforeAll(async () => {
        built = await publishedRepo();
    });

    afterAll(async () => {
        if (built !== null) {
            await removeRepo(built);
        }
    });

    return async () => {
        if (built === null) {
            throw new Error('publishedRepos hands out copies only once its repo is built');
        }

        return (await copiedRepo(built, [])).repo;
    };
}

/** A second working copy of what the first one published: another machine of the same person. */
export async function cloneOf(repo: Repo, name: string): Promise<string> {
    const dest = join(repo.base, name);

    await cloneRepo({ url: urlOf(repo) }, dest);

    return dest;
}
