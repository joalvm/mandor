import { lstat, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GitError } from '../../src/git/git-error.js';
import { run } from '../../src/git/run.js';
import { aheadBehind } from '../../src/repo/ahead-behind.js';
import { cloneRepo } from '../../src/repo/clone-repo.js';
import { fastForward } from '../../src/repo/fast-forward.js';
import { fetchRemote } from '../../src/repo/fetch-remote.js';
import { initRepo } from '../../src/repo/init-repo.js';
import { pushBranch } from '../../src/repo/push-branch.js';
import { hasUpstream } from '../../src/repo/upstream.js';
import { withFixedIdentity, withoutInheritedConfig } from '../support/git-environment.js';
import { cloneOf, commitFile, publishedRepos, urlOf } from '../support/remote.js';
import { createRepo, removeRepo, type Repo } from '../support/repo.js';

const published = publishedRepos();

let repo: Repo;

/** Commits a link the way a machine that keeps links writes one: a blob of its target, mode 120000. */
async function commitLink(root: string, name: string, target: string): Promise<void> {
    const text = join(root, '..', 'link-target.txt');

    await writeFile(text, target, 'utf8');

    const blob = await run(['hash-object', '-w', text], root);

    await run(['update-index', '--add', '--cacheinfo', `120000,${blob},${name}`], root);
    await run(['commit', '-m', `add ${name}`], root);
}

beforeEach(() => {
    withFixedIdentity();
});

afterEach(async () => {
    await removeRepo(repo);
});

describe('cloning the repo of an origin', () => {
    it('brings its files', async () => {
        repo = await published();

        const dest = await cloneOf(repo, 'copy');

        expect(await readFile(join(dest, 'mandor.yaml'), 'utf8')).toBe('name: Mi repo\n');
        expect(await hasUpstream(dest)).toBe(true);
    });

    it('takes a remote with nothing in it as an empty repo', async () => {
        repo = await createRepo();

        const dest = join(repo.base, 'copy');

        await cloneRepo({ url: urlOf(repo) }, dest);

        expect((await stat(join(dest, '.git'))).isDirectory()).toBe(true);
        expect(await aheadBehind(dest)).toEqual({ ahead: 0, behind: 0 });
    });

    it('fails when nothing answers at the url, and leaves no folder behind', async () => {
        repo = await createRepo();

        const dest = join(repo.base, 'copy');

        await expect(
            cloneRepo({ url: join(repo.base, 'nothing.git') }, dest),
        ).rejects.toBeInstanceOf(GitError);
        await expect(stat(dest)).rejects.toThrow();
    });
});

describe('bringing a link the origin holds', () => {
    /** A link checked out as one would let a repo from elsewhere point a doc at any file here. */
    it('writes it as a plain file holding where it pointed, on cloning and on moving forward', async () => {
        repo = await published();

        const other = await cloneOf(repo, 'other');

        await commitLink(repo.root, 'leak.md', '/etc/passwd');
        await pushBranch(repo.root, { url: urlOf(repo) });
        await fetchRemote(other, { url: urlOf(repo) });
        await fastForward(other);

        const copy = await cloneOf(repo, 'copy');

        for (const root of [other, copy]) {
            expect((await lstat(join(root, 'leak.md'))).isSymbolicLink()).toBe(false);
            expect(await readFile(join(root, 'leak.md'), 'utf8')).toBe('/etc/passwd');
        }
    });
});

describe('counting what the two sides have that the other lacks', () => {
    it('counts every commit of a branch the origin has never heard of as ahead', async () => {
        repo = await createRepo();
        await initRepo(repo.root);
        await commitFile(repo.root, 'a.yaml', 'a: 1\n', 'update a.yaml');

        expect(await aheadBehind(repo.root)).toEqual({ ahead: 2, behind: 0 });
    });

    it('says an empty repo has nothing ahead', async () => {
        repo = await createRepo();
        await run(['init', '-b', 'main'], repo.root);

        expect(await aheadBehind(repo.root)).toEqual({ ahead: 0, behind: 0 });
    });

    it('sees a commit of the other side only after fetching it', async () => {
        repo = await published();

        const other = await cloneOf(repo, 'other');

        await commitFile(repo.root, 'a.yaml', 'a: 1\n', 'update a.yaml');
        await pushBranch(repo.root, { url: urlOf(repo) });

        expect(await aheadBehind(other)).toEqual({ ahead: 0, behind: 0 });

        await fetchRemote(other, { url: urlOf(repo) });

        expect(await aheadBehind(other)).toEqual({ ahead: 0, behind: 1 });
    });

    it('counts both when each side wrote its own', async () => {
        repo = await published();

        const other = await cloneOf(repo, 'other');

        await commitFile(repo.root, 'a.yaml', 'a: 1\n', 'update a.yaml');
        await pushBranch(repo.root, { url: urlOf(repo) });
        await commitFile(other, 'b.yaml', 'b: 1\n', 'update b.yaml');
        await fetchRemote(other, { url: urlOf(repo) });

        expect(await aheadBehind(other)).toEqual({ ahead: 1, behind: 1 });
    });
});

describe('moving forward to what the origin has', () => {
    it('brings the file and names the paths it changed', async () => {
        repo = await published();

        const other = await cloneOf(repo, 'other');

        await commitFile(repo.root, 'a b.yaml', 'a: 1\n', 'update a b.yaml');
        await pushBranch(repo.root, { url: urlOf(repo) });
        await fetchRemote(other, { url: urlOf(repo) });

        expect(await fastForward(other)).toEqual(['a b.yaml']);
        expect(await readFile(join(other, 'a b.yaml'), 'utf8')).toBe('a: 1\n');
    });

    it('refuses when the two sides have gone apart, and touches nothing', async () => {
        repo = await published();

        const other = await cloneOf(repo, 'other');

        await commitFile(repo.root, 'a.yaml', 'a: 1\n', 'update a.yaml');
        await pushBranch(repo.root, { url: urlOf(repo) });
        await commitFile(other, 'b.yaml', 'b: 1\n', 'update b.yaml');
        await fetchRemote(other, { url: urlOf(repo) });

        const before = await run(['rev-parse', 'HEAD'], other);

        await expect(fastForward(other)).rejects.toBeInstanceOf(GitError);
        expect(await run(['rev-parse', 'HEAD'], other)).toBe(before);
    });
});

describe('sending the branch to the origin', () => {
    it('publishes a first branch and makes it follow the origin', async () => {
        repo = await createRepo();
        withoutInheritedConfig(repo.base);
        await initRepo(repo.root);
        await run(['remote', 'add', 'origin', urlOf(repo)], repo.root);

        expect(await hasUpstream(repo.root)).toBe(false);

        await pushBranch(repo.root, { url: urlOf(repo) });

        expect(await hasUpstream(repo.root)).toBe(true);
        expect(await run(['log', '--format=%s'], repo.remote)).toBe('init repo');
    });

    it('sends the next commits under the same name', async () => {
        repo = await published();
        await commitFile(repo.root, 'a.yaml', 'a: 1\n', 'update a.yaml');

        await pushBranch(repo.root, { url: urlOf(repo) });

        expect(await run(['log', '--format=%s'], repo.remote)).toBe(
            'update a.yaml\nupdate mandor.yaml\ninit repo',
        );
    });

    it('is refused when the origin moved on, and the origin keeps what it had', async () => {
        repo = await published();

        const other = await cloneOf(repo, 'other');

        await commitFile(other, 'b.yaml', 'b: 1\n', 'update b.yaml');
        await pushBranch(other, { url: urlOf(repo) });
        await commitFile(repo.root, 'a.yaml', 'a: 1\n', 'update a.yaml');

        const kept = await run(['log', '--format=%s'], repo.remote);

        await expect(pushBranch(repo.root, { url: urlOf(repo) })).rejects.toBeInstanceOf(GitError);
        expect(await run(['log', '--format=%s'], repo.remote)).toBe(kept);
    });
});
