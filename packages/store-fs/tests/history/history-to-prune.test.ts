import { describe, expect, it } from 'vitest';

import {
    historyOverBudget,
    historyToPrune,
    orphanBodies,
} from '../../src/history/history-to-prune.js';
import { entryOf, nameOf, stored } from './history-entry-fixture.js';

const NOW = new Date('2026-09-30T00:00:00.000Z');
const LIMITS = { maxEntries: 3, maxAgeDays: 30 };
const REF_A = 'a'.repeat(64);
const REF_B = 'b'.repeat(64);
const REF_C = 'c'.repeat(64);

describe('historyToPrune', () => {
    it('keeps everything while it is young and short, newest first', () => {
        const names = [nameOf(1), nameOf(3), nameOf(2)];

        const { keep, remove } = historyToPrune(names, NOW, LIMITS);

        expect(keep).toEqual([nameOf(3), nameOf(2), nameOf(1)]);
        expect(remove).toEqual([]);
    });

    it('drops what is older than the age limit', () => {
        const old = nameOf(1, '2026-08-30T23:59:59.999Z');
        const edge = nameOf(2, '2026-08-31T00:00:00.000Z');

        const { keep, remove } = historyToPrune([old, edge], NOW, LIMITS);

        expect(remove).toEqual([old]);
        expect(keep).toEqual([edge]);
    });

    it('drops the oldest of what is left past the count limit', () => {
        const names = [1, 2, 3, 4, 5].map((n) => nameOf(n));

        const { keep, remove } = historyToPrune(names, NOW, LIMITS);

        expect(keep).toEqual([nameOf(5), nameOf(4), nameOf(3)]);
        expect(remove).toEqual([nameOf(2), nameOf(1)]);
    });

    it('applies both limits to the same list', () => {
        const old = nameOf(9, '2026-01-01T00:00:00.000Z');
        const names = [old, ...[1, 2, 3, 4].map((n) => nameOf(n))];

        const { keep, remove } = historyToPrune(names, NOW, LIMITS);

        expect(keep).toHaveLength(3);
        expect(remove).toEqual([nameOf(1), old]);
    });
});

describe('orphanBodies', () => {
    it('names the bodies of the removed entries that no kept entry names', () => {
        const removed = entryOf(1, { request: stored(REF_A), response: stored(REF_B) });
        const kept = entryOf(2, { response: stored(REF_B) });

        expect(orphanBodies([removed], [kept])).toEqual([REF_A]);
    });

    it('ignores inline bodies and entries without a body', () => {
        const removed = entryOf(1, {
            request: { kind: 'inline', encoding: 'utf8', text: 'x' },
            response: null,
        });

        expect(orphanBodies([removed], [])).toEqual([]);
    });

    it('names a body once even when several removed entries share it', () => {
        const first = entryOf(1, { response: stored(REF_C) });
        const second = entryOf(2, { request: stored(REF_C) });

        expect(orphanBodies([first, second], [])).toEqual([REF_C]);
    });

    it('reads the bodies of an entry whose send failed as none', () => {
        const failed = {
            ...entryOf(1),
            outcome: { kind: 'failure' as const, code: 'request-refused', message: 'x' },
        };

        expect(orphanBodies([failed], [])).toEqual([]);
    });
});

describe('historyOverBudget', () => {
    /** The fixture stores 100 000 bytes a body; two of them fit, a third does not. */
    const BUDGET = 250_000;
    /** One body larger than the whole budget. */
    const HEAVY = {
        kind: 'stored',
        ref: REF_A,
        bytes: 300_000,
        contentType: 'text/plain',
    } as const;

    it('names the oldest entries whose stored bodies pass the budget, newest first in', () => {
        const entries = [3, 2, 1].map((n) =>
            entryOf(n, { response: stored(String(n).repeat(64)) }),
        );

        expect(
            historyOverBudget([...entries, entryOf(0, { response: stored(REF_A) })], BUDGET),
        ).toEqual([entries[2], entryOf(0, { response: stored(REF_A) })]);
    });

    it('counts a body once however many entries name it', () => {
        const entries = [4, 3, 2, 1].map((n) =>
            entryOf(n, { request: stored(REF_A), response: stored(REF_A) }),
        );

        expect(historyOverBudget(entries, BUDGET)).toEqual([]);
    });

    it('keeps an entry with no stored body, even past the budget', () => {
        const newest = entryOf(2, { response: HEAVY });
        const light = entryOf(1, { response: { kind: 'inline', encoding: 'utf8', text: 'x' } });

        expect(historyOverBudget([newest, light], BUDGET)).toEqual([]);
    });

    it('keeps the newest entry whatever it holds: it is the send just made', () => {
        const newest = entryOf(2, { response: HEAVY });
        const older = entryOf(1, { response: stored(REF_B) });

        expect(historyOverBudget([newest, older], BUDGET)).toEqual([older]);
    });
});
