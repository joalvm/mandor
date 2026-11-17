import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mergeRemote } from '../../src/repo/merge-remote.js';
import { stageTexts } from '../../src/repo/stage-texts.js';
import { divergences, SEED, type Divergence } from '../support/diverge.js';
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

describe('the three texts of a clash (stage-texts)', () => {
    it('reads what both sides came from, what this side holds and what the origin holds', async () => {
        pair = await diverge(
            { 'a.txt': 'MINE\ntwo\nthree\n' },
            { 'a.txt': 'THEIRS\ntwo\nthree\n' },
        );
        await mergeRemote(pair.mine);

        await expect(stageTexts(pair.mine, 'a.txt')).resolves.toEqual({
            base: SEED['a.txt'],
            ours: 'MINE\ntwo\nthree\n',
            theirs: 'THEIRS\ntwo\nthree\n',
        });
    });

    it('answers null for the side that deleted the file', async () => {
        pair = await diverge({ 'a.txt': null }, { 'a.txt': 'one\ntwo\nTHREE\n' });
        await mergeRemote(pair.mine);

        await expect(stageTexts(pair.mine, 'a.txt')).resolves.toEqual({
            base: SEED['a.txt'],
            ours: null,
            theirs: 'one\ntwo\nTHREE\n',
        });
    });

    it('answers null for the origin of a file both sides added', async () => {
        pair = await diverge({ 'c.txt': 'mine\n' }, { 'c.txt': 'theirs\n' });
        await mergeRemote(pair.mine);

        await expect(stageTexts(pair.mine, 'c.txt')).resolves.toEqual({
            base: null,
            ours: 'mine\n',
            theirs: 'theirs\n',
        });
    });

    it('answers nothing for a path the merge did not stop on', async () => {
        pair = await diverge({ 'b.txt': 'mine\n' }, { 'a.txt': 'one\ntwo\nTHREE\n' });
        await mergeRemote(pair.mine);

        await expect(stageTexts(pair.mine, 'b.txt')).resolves.toEqual({
            base: null,
            ours: null,
            theirs: null,
        });
    });
});
