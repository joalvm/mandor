import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { cloneRepo, commitAll, fetchRemote, pushBranch } from '@mandor/git';
import { afterAll, beforeAll, vi } from 'vitest';

import { bareOrigin, publishMandorRepo, type BareOrigin } from '../support/bare-origin.js';

const exec = promisify(execFile);

/** What a side does to files: a text writes it, `null` deletes it. */
export type Edits = Record<string, string | null>;

/** Two machines of one person around the server of an origin; the app runs on `mine`. */
export type TwoMachines = {
    base: string;
    bare: BareOrigin;
    mine: { name: string; root: string };
    theirs: string;
};

/** The server of an origin with the repo of Mandor, and the same `seed` on both machines. */
export async function twoMachines(seed: Edits): Promise<TwoMachines> {
    const base = await mkdtemp(join(tmpdir(), 'mandor-merge-'));

    isolateGit(base);

    const bare = await bareOrigin(base, 'remote');

    await publishMandorRepo(base, bare, 'Team');

    const theirs = join(base, 'theirs');

    await cloneRepo({ url: bare.url }, theirs);
    await write(theirs, seed, 'seed');
    await pushBranch(theirs, { url: bare.url });
    await cloneRepo({ url: bare.url }, join(base, 'mine'));

    return machinesAt(base);
}

/**
 * The two machines of `seed` for every test of a file. Building them spawns git a dozen times
 * and copying them spawns it none, so they are built once, before the first test, and each test
 * gets a copy of its own to change. Called at the top of the file, where hooks are registered.
 * `prepare` is what every test of the file would do first on disk, done once on the built ones.
 */
export function machinesOf(
    seed: Edits,
    prepare?: (machines: TwoMachines) => Promise<void>,
): () => Promise<TwoMachines> {
    let built: TwoMachines | null = null;

    beforeAll(async () => {
        const machines = await twoMachines(seed);

        await prepare?.(machines);
        built = machines;
    });

    afterAll(async () => {
        if (built !== null) {
            await removeMachines(built);
        }
    });

    return () => {
        if (built === null) {
            throw new Error('machinesOf hands out copies only once its machines are built');
        }

        return copyMachines(built);
    };
}

/** A copy of `from` somewhere else, whose machines name the server where it lies now. */
async function copyMachines(from: TwoMachines): Promise<TwoMachines> {
    const base = await mkdtemp(join(tmpdir(), 'mandor-merge-'));

    await cp(from.base, base, { recursive: true });
    isolateGit(base);

    const machines = machinesAt(base);

    for (const root of [machines.mine.root, machines.theirs]) {
        const config = join(root, '.git', 'config');
        const text = await readFile(config, 'utf8');

        await writeFile(config, text.replaceAll(from.bare.url, machines.bare.url), 'utf8');
    }

    return machines;
}

/** Git reads no setting of the machine running the test, and signs as Mandor. */
function isolateGit(base: string): void {
    vi.stubEnv('GIT_CONFIG_GLOBAL', join(base, 'no-global-config'));
    vi.stubEnv('GIT_CONFIG_SYSTEM', join(base, 'no-system-config'));
    vi.stubEnv('GIT_AUTHOR_NAME', 'Mandor');
    vi.stubEnv('GIT_AUTHOR_EMAIL', 'mandor@example.test');
    vi.stubEnv('GIT_COMMITTER_NAME', 'Mandor');
    vi.stubEnv('GIT_COMMITTER_EMAIL', 'mandor@example.test');
}

/** Where each piece of the machines built in `base` lies: the layout `twoMachines` writes. */
function machinesAt(base: string): TwoMachines {
    const path = join(base, 'remote.git');

    return {
        base,
        bare: { path, url: pathToFileURL(path).toString() },
        mine: { name: 'Team', root: join(base, 'mine') },
        theirs: join(base, 'theirs'),
    };
}

/** Writes and deletes files, and records them in one commit. */
export async function write(root: string, edits: Edits, message: string): Promise<void> {
    for (const [name, text] of Object.entries(edits)) {
        if (text === null) {
            await rm(join(root, name));
        } else {
            await mkdir(dirname(join(root, name)), { recursive: true });
            await writeFile(join(root, name), text, 'utf8');
        }
    }

    await commitAll(root, message);
}

/** The other machine did `theirs` and sent it; this one did `mine` and has looked at the server. */
export async function diverged(machines: TwoMachines, mine: Edits, theirs: Edits): Promise<void> {
    await write(machines.theirs, theirs, 'theirs');
    await pushBranch(machines.theirs, { url: machines.bare.url });
    await write(machines.mine.root, mine, 'mine');
    await fetchRemote(machines.mine.root, { url: machines.bare.url });
}

/** How many parents the last commit of a copy has: two is a merge. */
export async function parentsOfHead(root: string): Promise<number> {
    const { stdout } = await exec('git', ['rev-list', '--parents', '-n', '1', 'HEAD'], {
        cwd: root,
    });

    return stdout.trim().split(' ').length - 1;
}

/** The state of the tree, in the porcelain format: empty when nothing is pending. */
export async function pending(root: string): Promise<string> {
    const { stdout } = await exec('git', ['status', '--porcelain'], { cwd: root });

    return stdout;
}

export async function removeMachines(machines: TwoMachines): Promise<void> {
    await rm(machines.base, { force: true, recursive: true });
}
