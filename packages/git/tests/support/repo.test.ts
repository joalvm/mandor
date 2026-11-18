import { readdir, stat } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { createRepo, removeRepo, type Repo } from './repo.js';

let repo: Repo;

beforeEach(async () => {
    repo = await createRepo();
});

afterEach(async () => {
    await removeRepo(repo);
});

describe('the repo fixture', () => {
    /** `initRepo` has to be able to run on it, and it only runs on a directory git owns nothing of. */
    it('hands out an empty working directory', async () => {
        expect(await readdir(repo.root)).toEqual([]);
    });

    /** The remote is a directory, not a URL: a suite that needs the network fails on a train. */
    it('gives it a bare remote sitting on disk', async () => {
        expect(await run(['rev-parse', '--is-bare-repository'], repo.remote)).toBe('true');
    });

    it('takes working tree and remote away together', async () => {
        await removeRepo(repo);

        await expect(stat(repo.base)).rejects.toThrow();
    });
});
