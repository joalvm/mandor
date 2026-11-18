import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GitError } from '../../src/git/git-error.js';
import { run, runText } from '../../src/git/run.js';
import { withoutGit } from '../support/without-git.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-git-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function failureOf(work: Promise<unknown>): Promise<GitError> {
    await expect(work).rejects.toBeInstanceOf(GitError);

    const refusal: unknown = await work.catch((error: unknown) => error);

    return refusal as GitError;
}

describe('running git', () => {
    it('returns what git printed on stdout', async () => {
        expect(await run(['--version'], root)).toContain('git version');
    });

    it('fails with git-missing when git is not on PATH', async () => {
        const failure = await withoutGit(() => failureOf(run(['--version'], root)));

        expect(failure.code).toBe('git-missing');
    });

    it('fails with git-not-a-repo when the directory is not a repository', async () => {
        const failure = await failureOf(run(['status', '--porcelain'], root));

        expect(failure.code).toBe('git-not-a-repo');
    });

    it('fails with git-failed when git refuses the command for any other reason', async () => {
        const failure = await failureOf(run(['--nonsense-flag'], root));

        expect(failure.code).toBe('git-failed');
    });

    /** The stderr of git names paths and remotes. It belongs in the log, not on screen. */
    it('keeps the raw output of git out of the message the app shows', async () => {
        const failure = await failureOf(run(['status', '--porcelain'], root));

        expect(failure.message).not.toContain('not a git repository');
        expect(failure.detail).toContain('not a git repository');
    });

    it('keeps the last newline of what git printed when asked for the text as it came', async () => {
        const trimmed = await run(['--version'], root);

        expect(await runText(['--version'], root)).toBe(`${trimmed}\n`);
    });

    /** Ids are long paths: on Windows a checkout deep in the tree fails without the setting. */
    it('carries the settings every call needs: no links, and long paths', async () => {
        expect(await run(['config', '--get', 'core.symlinks'], root)).toBe('false');
        expect(await run(['config', '--get', 'core.longpaths'], root)).toBe('true');
    });

    /** Whatever path asks for it, git is never reached: the refusal comes first. */
    it('refuses a push that would rewrite the origin before it asks git anything', async () => {
        const failure = await failureOf(run(['push', '--force', 'origin', 'main'], root));

        expect(failure.code).toBe('git-failed');
        expect(failure.detail).toContain('refused a push');
    });
});
