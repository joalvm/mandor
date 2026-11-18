import { describe, expect, it } from 'vitest';

import { historyDays } from '../../../../src/renderer/features/history/lib/history-days.js';
import { removalOf } from '../../../../src/renderer/features/history/lib/removal-of.js';
import { requestPathsOf } from '../../../../src/renderer/features/history/lib/request-paths.js';
import { ID_A, ID_B, ID_C, summaryOf } from '../../support/history-fixture.js';

/** Midday, so no zone moves it across a day boundary. */
const DAY_ONE = '2026-09-02T12:00:00.000Z';
const DAY_TWO = '2026-09-01T12:00:00.000Z';

describe('grouping the history by day', () => {
    it('keeps the order it was given and breaks it where the day changes', () => {
        const a = summaryOf(ID_A, { sentAt: DAY_ONE });
        const b = summaryOf(ID_B, { sentAt: '2026-09-02T12:00:01.000Z' });
        const c = summaryOf(ID_C, { sentAt: DAY_TWO });

        expect(historyDays([a, b, c])).toEqual([
            { day: '2026-09-02', summaries: [a, b] },
            { day: '2026-09-01', summaries: [c] },
        ]);
    });

    it('is nothing for no sends', () => {
        expect(historyDays([])).toEqual([]);
    });
});

describe('the requests that sent something', () => {
    it('lists each once, in the order the list meets them', () => {
        const paths = requestPathsOf([
            summaryOf(ID_A, { itemPath: 'b' }),
            summaryOf(ID_B, { itemPath: 'a' }),
            summaryOf(ID_C, { itemPath: 'b' }),
        ]);

        expect(paths).toEqual(['b', 'a']);
    });

    it('leaves out the sends of a request saved nowhere', () => {
        const paths = requestPathsOf([
            summaryOf(ID_A, { itemPath: null }),
            summaryOf(ID_B, { itemPath: 'a' }),
        ]);

        expect(paths).toEqual(['a']);
    });
});

describe('what a delete answers', () => {
    it('deletes everything when the question was about everything', () => {
        expect(removalOf('all', [])).toEqual({ all: true });
    });

    it('deletes the picks when the question was about them', () => {
        expect(removalOf('selected', [ID_A, ID_B])).toEqual({ ids: [ID_A, ID_B] });
    });

    it('deletes nothing when the picks left before the answer', () => {
        expect(removalOf('selected', [])).toBeNull();
    });
});
