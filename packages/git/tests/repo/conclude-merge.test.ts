import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { commitMessage } from '../../src/repo/commit-message.js';
import { concludeMerge } from '../../src/repo/conclude-merge.js';
import { mergeRemote } from '../../src/repo/merge-remote.js';
import { divergences, type Divergence } from '../support/diverge.js';
import { withFixedIdentity } from '../support/git-environment.js';
import { removeRepo } from '../support/repo.js';

const diverge = divergences();

let pair: Divergence;

beforeEach(() => {
    withFixedIdentity();
});

afterEach(async () => {
    await removeRepo(pair.repo);
});

const MESSAGE = commitMessage({ kind: 'merge-origin', name: 'Team' });

async function parentsOfHead(root: string): Promise<number> {
    return (await run(['rev-list', '--parents', '-n', '1', 'HEAD'], root)).split(' ').length - 1;
}

describe('closing the merge that is open (conclude-merge)', () => {
    it('records what was written to the clashed path, in a commit with both sides as parents', async () => {
        pair = await diverge(
            { 'a.txt': 'MINE\ntwo\nthree\n' },
            { 'a.txt': 'THEIRS\ntwo\nthree\n' },
        );
        await mergeRemote(pair.mine);
        await writeFile(join(pair.mine, 'a.txt'), 'MINE\ntwo\nthree\n', 'utf8');
        await concludeMerge(pair.mine, ['a.txt'], MESSAGE);

        expect(await run(['log', '-1', '--format=%s'], pair.mine)).toBe('merge changes of Team');
        expect(await parentsOfHead(pair.mine)).toBe(2);
        expect(await run(['status', '--porcelain'], pair.mine)).toBe('');
        expect(await readFile(join(pair.mine, 'a.txt'), 'utf8')).toBe('MINE\ntwo\nthree\n');
    });

    it('records the deletion of a path that was answered by removing it', async () => {
        pair = await diverge({ 'a.txt': 'ONE\ntwo\nthree\n' }, { 'a.txt': null });
        await mergeRemote(pair.mine);
        await rm(join(pair.mine, 'a.txt'));
        await concludeMerge(pair.mine, ['a.txt'], MESSAGE);

        await expect(stat(join(pair.mine, 'a.txt'))).rejects.toThrow();
        expect(await run(['status', '--porcelain'], pair.mine)).toBe('');
    });

    it('closes a merge git joined alone, with no path to answer', async () => {
        pair = await diverge({ 'b.txt': 'mine\n' }, { 'a.txt': 'one\ntwo\nTHREE\n' });
        await mergeRemote(pair.mine);
        const changed = await concludeMerge(pair.mine, [], MESSAGE);

        expect(changed).toEqual(['a.txt']);
        expect(await parentsOfHead(pair.mine)).toBe(2);
        expect(await readFile(join(pair.mine, 'a.txt'), 'utf8')).toBe('one\ntwo\nTHREE\n');
    });
});
