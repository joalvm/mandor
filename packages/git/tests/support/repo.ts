import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterAll, beforeAll } from 'vitest';

import { run } from '../../src/git/run.js';
import { initRepo } from '../../src/repo/init-repo.js';
import { withoutIdentity, withoutInheritedConfig } from './git-environment.js';

/** Named here too: what git picks by default varies by machine, and a fixture cannot. */
const BRANCH = 'main';

const WORK = 'work';

/** A bare repo on disk. The suite gets a remote to talk to without opening a socket. */
const REMOTE = 'remote.git';

/**
 * A working directory and the remote it will one day push to, both under one temporary
 * directory so a single `removeRepo` takes the whole thing away. The working directory is
 * empty on purpose: `initRepo` is what turns it into a repo, and that is under test.
 */
export type Repo = { base: string; root: string; remote: string };

export async function createRepo(): Promise<Repo> {
    const base = await mkdtemp(join(tmpdir(), 'mandor-git-'));

    withoutInheritedConfig(base);

    await mkdir(join(base, WORK));
    await run(['init', '--bare', '-b', BRANCH, REMOTE], base);

    return { base, root: join(base, WORK), remote: join(base, REMOTE) };
}

export function removeRepo(repo: Repo): Promise<void> {
    return rm(repo.base, { recursive: true, force: true });
}

/**
 * A repo `initRepo` already ran on, for every test of a file: built once before the first test
 * and copied for each. `prepare` lays out what the working directory holds before it runs.
 * Called at the top of the file, where hooks register.
 */
export function initializedRepos(
    prepare: (root: string) => Promise<void> = () => Promise.resolve(),
): () => Promise<Repo> {
    let built: Repo | null = null;

    beforeAll(async () => {
        const repo = await createRepo();

        // The commit of the stage is signed by the identity the repo writes for itself.
        withoutIdentity();
        await prepare(repo.root);
        await initRepo(repo.root);
        built = repo;
    });

    afterAll(async () => {
        if (built !== null) {
            await removeRepo(built);
        }
    });

    return async () => {
        if (built === null) {
            throw new Error('initializedRepos hands out copies only once its repo is built');
        }

        return (await copiedRepo(built, [])).repo;
    };
}

/** A repo moved somewhere else, and where a path under the old one lies now. */
export type CopiedRepo = { repo: Repo; moved: (path: string) => string };

/**
 * A copy of `from` somewhere else. Its working copy, and every clone of it in `clones`, name the
 * remote where it lies now: copied as they are, they would push to the remote of `from`.
 */
export async function copiedRepo(from: Repo, clones: readonly string[]): Promise<CopiedRepo> {
    const base = await mkdtemp(join(tmpdir(), 'mandor-git-'));

    await cp(from.base, base, { recursive: true });
    withoutInheritedConfig(base);

    const moved = (path: string): string => join(base, relative(from.base, path));
    const repo = { base, root: moved(from.root), remote: moved(from.remote) };

    for (const root of [repo.root, ...clones.map(moved)]) {
        const config = join(root, '.git', 'config');
        const text = await readFile(config, 'utf8');

        await writeFile(
            config,
            text.replaceAll(asConfigValue(from.remote), asConfigValue(repo.remote)),
            'utf8',
        );
    }

    return { repo, moved };
}

/** Git writes a backslash of a value as two: a Windows path in a config is not the path. */
function asConfigValue(path: string): string {
    return path.replaceAll('\\', '\\\\');
}
