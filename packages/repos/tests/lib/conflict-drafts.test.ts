import { beforeEach, describe, expect, it } from 'vitest';

import { conflictDrafts, pickOf } from '../../src/lib/conflict-drafts.js';

function state() {
    return conflictDrafts.getState();
}

beforeEach(() => {
    conflictDrafts.setState(conflictDrafts.getInitialState(), true);
});

describe('the answers a clash tab keeps until it resolves (conflict-drafts)', () => {
    it('holds an answer per question, each tab apart', () => {
        state().choose('one', 'headers/Accept#0', { pick: 'theirs' });
        state().choose('one', 'body/content', { text: 'mine and theirs' });
        state().choose('two', 'method', { pick: 'ours' });

        expect(state().choices['one']).toEqual({
            'headers/Accept#0': { pick: 'theirs' },
            'body/content': { text: 'mine and theirs' },
        });
        expect(state().choices['two']).toEqual({ method: { pick: 'ours' } });
    });

    it('replaces the answer a question had', () => {
        state().choose('one', 'method', { pick: 'ours' });
        state().choose('one', 'method', { pick: 'theirs' });

        expect(state().choices['one']).toEqual({ method: { pick: 'theirs' } });
    });

    it('knows a tab has a draft only once something was answered', () => {
        expect(state().hasDraft('one')).toBe(false);

        state().choose('one', 'method', { pick: 'ours' });

        expect(state().hasDraft('one')).toBe(true);
        expect(state().hasDraft('two')).toBe(false);
    });

    it('takes an answer back so the question waits again, in that tab only', () => {
        state().choose('one', 'method', { pick: 'ours' });
        state().choose('one', 'url', { pick: 'theirs' });
        state().choose('two', 'method', { pick: 'ours' });
        state().clear('one', 'method');

        expect(state().choices['one']).toEqual({ url: { pick: 'theirs' } });
        expect(state().choices['two']).toEqual({ method: { pick: 'ours' } });
    });

    it('forgets what a tab had answered, and nothing else', () => {
        state().choose('one', 'method', { pick: 'ours' });
        state().choose('two', 'method', { pick: 'ours' });
        state().discard('one');

        expect(state().hasDraft('one')).toBe(false);
        expect(state().hasDraft('two')).toBe(true);
    });

    it('lets a tab with nothing answered leave without asking', async () => {
        await expect(state().askToLeave('one')).resolves.toBe(true);
        expect(state().closing).toEqual({});
    });

    it('waits for the person when a draft would be lost, and lets the tab go on a yes', async () => {
        state().choose('one', 'method', { pick: 'ours' });

        const answer = state().askToLeave('one');

        expect(Object.keys(state().closing)).toEqual(['one']);

        state().answerLeave('one', true);

        await expect(answer).resolves.toBe(true);
        expect(state().closing).toEqual({});
    });

    it('keeps the tab on a no, with the draft untouched', async () => {
        state().choose('one', 'method', { pick: 'ours' });

        const answer = state().askToLeave('one');

        state().answerLeave('one', false);

        await expect(answer).resolves.toBe(false);
        expect(state().hasDraft('one')).toBe(true);
    });

    it('gives one answer to a question asked twice', async () => {
        state().choose('one', 'method', { pick: 'ours' });

        const first = state().askToLeave('one');
        const second = state().askToLeave('one');

        state().answerLeave('one', true);

        await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    });

    it('tells a question still waiting to stay when the tab is let go of', async () => {
        state().choose('one', 'method', { pick: 'ours' });

        const answer = state().askToLeave('one');

        state().discard('one');

        await expect(answer).resolves.toBe(false);
    });

    it('ignores an answer nobody asked for', () => {
        state().answerLeave('ghost', true);

        expect(state().closing).toEqual({});
    });

    it('reads which side an answer took, and nothing from a text or from no answer', () => {
        expect(pickOf({ pick: 'ours' })).toBe('ours');
        expect(pickOf({ pick: 'theirs' })).toBe('theirs');
        expect(pickOf({ text: 'mine and theirs' })).toBeNull();
        expect(pickOf(undefined)).toBeNull();
    });
});
