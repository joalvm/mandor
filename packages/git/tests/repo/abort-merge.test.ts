import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { abortMerge } from '../../src/repo/abort-merge.js';
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

describe('giving the tree back (abort-merge)', () => {
    it('leaves the tree as it was before the merge opened, with nothing half done', async () => {
        pair = await diverge(
            { 'a.txt': 'MINE\ntwo\nthree\n' },
            { 'a.txt': 'THEIRS\ntwo\nthree\n' },
        );

        const before = await run(['rev-parse', 'HEAD'], pair.mine);

        await mergeRemote(pair.mine);
        await abortMerge(pair.mine);

        expect(await run(['status', '--porcelain'], pair.mine)).toBe('');
        expect(await run(['rev-parse', 'HEAD'], pair.mine)).toBe(before);
        expect(await readFile(join(pair.mine, 'a.txt'), 'utf8')).toBe('MINE\ntwo\nthree\n');
    });
});
