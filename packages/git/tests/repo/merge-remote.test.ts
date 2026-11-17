import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GitError } from '../../src/git/git-error.js';
import { run } from '../../src/git/run.js';
import { initRepo } from '../../src/repo/init-repo.js';
import { mergeRemote } from '../../src/repo/merge-remote.js';
import { divergences, type Divergence } from '../support/diverge.js';
import { withFixedIdentity } from '../support/git-environment.js';
import { createRepo, removeRepo } from '../support/repo.js';

const diverge = divergences();

let pair: Divergence | null = null;

beforeEach(() => {
    withFixedIdentity();
});

afterEach(async () => {
    if (pair !== null) {
        await removeRepo(pair.repo);
        pair = null;
    }
});

function isOpen(root: string): Promise<boolean> {
    return run(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], root).then(
        () => true,
        () => false,
    );
}

describe('joining what the origin has into the branch (merge-remote)', () => {
    it('answers no clash for two sides that touched different files, and leaves the merge open', async () => {
        pair = await diverge({ 'b.txt': 'mine\n' }, { 'a.txt': 'one\ntwo\nTHREE\n' });

        const before = await run(['rev-parse', 'HEAD'], pair.mine);

        await expect(mergeRemote(pair.mine)).resolves.toEqual({ conflicted: [] });
        expect(await isOpen(pair.mine)).toBe(true);
        expect(await run(['rev-parse', 'HEAD'], pair.mine)).toBe(before);
    });

    it('answers the path of what both sides wrote on the same line', async () => {
        pair = await diverge(
            { 'a.txt': 'MINE\ntwo\nthree\n' },
            { 'a.txt': 'THEIRS\ntwo\nthree\n' },
        );

        await expect(mergeRemote(pair.mine)).resolves.toEqual({ conflicted: ['a.txt'] });
        expect(await isOpen(pair.mine)).toBe(true);
    });

    it('lets git join distant lines of one file by itself', async () => {
        pair = await diverge({ 'a.txt': 'ONE\ntwo\nthree\n' }, { 'a.txt': 'one\ntwo\nTHREE\n' });

        await expect(mergeRemote(pair.mine)).resolves.toEqual({ conflicted: [] });
    });

    it('throws what git refused when it stopped without a clash to answer', async () => {
        const repo = await createRepo();

        try {
            await initRepo(repo.root);

            await expect(mergeRemote(repo.root)).rejects.toBeInstanceOf(GitError);
        } finally {
            await removeRepo(repo);
        }
    });
});
