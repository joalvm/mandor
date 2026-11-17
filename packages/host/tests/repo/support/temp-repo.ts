import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { initRepo } from '@mandor/git';
import { afterEach, beforeEach } from 'vitest';

import { copiedRepo } from '../../support/copied-repo.js';

const exec = promisify(execFile);

/** A calm no test outlives: what is scheduled with it only commits when the test says so. */
export const LONG_CALM = 600_000;

export type TempRepo = {
    root: () => string;
    /** Writes a file under the repo, the way a handler writes before it asks for a commit. */
    write: (path: string, text: string) => Promise<void>;
    /** Subjects of the history, newest first. */
    subjects: () => Promise<string[]>;
    /** What `git status --porcelain` says: empty when every write is committed. */
    dirty: () => Promise<string>;
    /** Paths the newest commit touched. */
    lastFiles: () => Promise<string[]>;
};

/** Points git at configuration files that do not exist, beside `dir`. */
function isolated(dir: string): void {
    // The suite has to see the same git on every machine, whatever the developer keeps in
    // their own configuration files.
    process.env['GIT_CONFIG_GLOBAL'] = join(dir, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(dir, 'no-system-config');
}

/**
 * A real repo on disk with its first commit made, one per test: made once for the file and
 * copied for each. The scheduler of commits is about what ends up in `git log`, so the suite
 * asks git and not a double of it.
 */
export function tempRepo(): TempRepo {
    const freshRepo = copiedRepo(async (made) => {
        isolated(join(made, '..'));
        await initRepo(made);
    });
    let base = '';
    let root = '';

    async function git(args: string[]): Promise<string[]> {
        const { stdout } = await exec('git', args, { cwd: root });

        return stdout.split('\n').filter((line) => line !== '');
    }

    beforeEach(async () => {
        base = await mkdtemp(join(tmpdir(), 'mandor-turn-'));
        root = await freshRepo(join(base, 'work'));
        isolated(base);
    });

    // On Windows a git that just exited, or the scanner of the system, can still hold the folder
    // for a moment: the removal answers EBUSY and is tried again, as a person would.
    afterEach(async () => {
        await rm(base, { recursive: true, force: true, maxRetries: 10 });
    });

    return {
        root: () => root,
        write: (path, text) => writeFile(join(root, path), text, 'utf8'),
        subjects: () => git(['log', '--pretty=%s']),
        dirty: async () => (await git(['status', '--porcelain'])).join('\n'),
        lastFiles: () => git(['show', '--name-only', '--pretty=format:']),
    };
}

/** A folder beside the repo that is no repo yet: git refuses a commit that asks for it. */
export async function plainFolder(repo: TempRepo): Promise<string> {
    const folder = join(repo.root(), '..', 'plain');

    await mkdir(folder);
    await writeFile(join(folder, 'a.yaml'), 'one\n', 'utf8');

    return folder;
}
