import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { cloneRepo } from '../../src/repo/clone-repo.js';
import { hasCommits } from '../../src/repo/has-commits.js';
import { nameFirstBranch } from '../../src/repo/name-first-branch.js';
import { withFixedIdentity } from '../support/git-environment.js';
import { publishedRepo, urlOf } from '../support/remote.js';
import { createRepo, removeRepo, type Repo } from '../support/repo.js';

let repo: Repo;

beforeEach(() => {
    withFixedIdentity();
});

afterEach(async () => {
    await removeRepo(repo);
});

describe('telling a clone with history from one without', () => {
    it('says a clone of an empty remote has no commit', async () => {
        repo = await createRepo();

        const dest = join(repo.base, 'copy');

        await cloneRepo({ url: urlOf(repo) }, dest);

        expect(await hasCommits(dest)).toBe(false);
    });

    it('says a clone of a remote with work has commits', async () => {
        repo = await publishedRepo();

        const dest = join(repo.base, 'copy');

        await cloneRepo({ url: urlOf(repo) }, dest);

        expect(await hasCommits(dest)).toBe(true);
    });
});

describe('naming the branch a clone without commits is born on', () => {
    it('moves the unborn branch to the name asked', async () => {
        repo = await createRepo();

        const dest = join(repo.base, 'copy');

        await cloneRepo({ url: urlOf(repo) }, dest);
        await nameFirstBranch(dest, 'trunk');

        expect(await run(['symbolic-ref', '--short', 'HEAD'], dest)).toBe('trunk');
    });
});
