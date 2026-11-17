import { afterEach, describe, expect, it } from 'vitest';

import { unsavedQuestion } from '../../src/tab/unsaved-question.js';

const TAB = { id: 'login', kind: 'draft', resource: 'mandor://r/w/item/login' };

afterEach(() => {
    unsavedQuestion.setState({ asking: null });
});

describe('the question about unsaved work (unsaved-question)', () => {
    it('holds the tab asked about until it is answered, and hands the answer back', async () => {
        const answer = unsavedQuestion.getState().ask(TAB);

        expect(unsavedQuestion.getState().asking?.tab).toBe(TAB);

        unsavedQuestion.getState().answer(true);

        await expect(answer).resolves.toBe(true);
        expect(unsavedQuestion.getState().asking).toBeNull();
    });

    it('keeps the tab when the answer is to stay', async () => {
        const answer = unsavedQuestion.getState().ask(TAB);

        unsavedQuestion.getState().answer(false);

        await expect(answer).resolves.toBe(false);
    });

    it('takes an answer nobody asked for as nothing', () => {
        unsavedQuestion.getState().answer(true);

        expect(unsavedQuestion.getState().asking).toBeNull();
    });
});
