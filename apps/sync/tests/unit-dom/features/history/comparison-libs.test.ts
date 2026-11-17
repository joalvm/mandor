import { selectTabs, shellStore } from '@mandor/shell';
import { afterEach, describe, expect, it } from 'vitest';

import {
    diffFailure,
    readFailure,
} from '../../../../src/renderer/features/history/lib/diff-failure.js';
import { factText } from '../../../../src/renderer/features/history/lib/fact-text.js';
import { openComparison } from '../../../../src/renderer/features/history/lib/open-comparison.js';
import { answerOf } from '../../../../src/renderer/features/history/lib/answer-of.js';
import { inSentOrder } from '../../../../src/renderer/features/history/lib/sent-order.js';
import { entryOf, failedEntryOf, ID_A, ID_B } from '../../support/history-fixture.js';

afterEach(() => {
    shellStore.getState().reset();
});

describe('the facts of a response as a person reads them', () => {
    it('puts the unit with the number', () => {
        expect(factText('status', 404)).toBe('404');
        expect(factText('totalMs', 120)).toBe('120 ms');
        expect(factText('totalMs', 2500)).toBe('2.5 s');
        expect(factText('bodyBytes', 3100)).toBe('3.1 kB');
        expect(factText('version', '2')).toBe('HTTP/2');
        expect(factText('version', '1.1')).toBe('HTTP/1.1');
    });
});

describe('the answer of a stored send', () => {
    it('is the response when there was one and nothing when the send failed', () => {
        expect(answerOf(entryOf(ID_A))?.status).toBe(200);
        expect(answerOf(failedEntryOf(ID_A))).toBeNull();
    });
});

describe('putting two sends in order', () => {
    it('reads the one that left first first, whichever way they came', () => {
        const older = entryOf(ID_A, { sentAt: '2026-09-02T10:00:00.000Z' });
        const newer = entryOf(ID_B, { sentAt: '2026-09-02T11:00:00.000Z' });

        expect(inSentOrder(newer, older)).toEqual([older, newer]);
        expect(inSentOrder(older, newer)).toEqual([older, newer]);
    });
});

describe('why a comparison cannot be drawn', () => {
    const ready = { entry: entryOf(ID_A), state: 'ready' } as const;

    it('is the code of the first read that failed', () => {
        const first = { code: 'fs-read', state: 'failed' } as const;
        const second = { code: 'bad-request', state: 'failed' } as const;

        expect(diffFailure(first, second)).toBe('fs-read');
        expect(diffFailure(ready, second)).toBe('bad-request');
    });

    it('is nothing while a read is under way or both came', () => {
        expect(diffFailure(ready, { state: 'loading' })).toBeNull();
        expect(diffFailure(ready, ready)).toBeNull();
    });
});

describe('why one read gave no send', () => {
    it('is the code of a read that failed', () => {
        expect(readFailure({ code: 'fs-read', state: 'failed' })).toBe('fs-read');
    });

    it('is nothing while the read is under way or once the send came', () => {
        expect(readFailure({ state: 'loading' })).toBeNull();
        expect(readFailure({ entry: entryOf(ID_A), state: 'ready' })).toBeNull();
    });
});

describe('opening a comparison', () => {
    function comparisons() {
        return selectTabs(shellStore.getState()).filter((tab) => tab.kind === 'history-diff');
    }

    it('is the same tab whichever send was picked first', () => {
        openComparison('demo', [ID_A, ID_B]);
        openComparison('demo', [ID_B, ID_A]);

        expect(comparisons()).toHaveLength(1);
    });

    it('opens a tab of its own for each pair', () => {
        openComparison('demo', [ID_A, ID_B]);
        openComparison('demo', [ID_A, '3a9e5d71-4b8c-4f20-9d16-7c2b1e0a4f55']);

        expect(comparisons()).toHaveLength(2);
    });
});
