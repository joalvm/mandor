import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dropOriginState } from '../../src/origin/origin-scope.js';
import { createPendingWrites, settlePendingWrites } from '../../src/writes/pending-writes.js';

/** Past the pause the typing has to keep before an edit goes to disk. */
const AFTER_THE_PAUSE = 500;

type Written = [key: string, text: string];

function writingTo(written: Written[]) {
    return createPendingWrites<string, string>((key, text) => {
        written.push([key, text]);

        return Promise.resolve();
    });
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('the edits on their way to disk', () => {
    it('writes an edit once the typing stops, and not before', () => {
        const written: Written[] = [];
        const writes = writingTo(written);

        writes.schedule('notes', 'one');

        expect(written).toEqual([]);

        vi.advanceTimersByTime(AFTER_THE_PAUSE);

        expect(written).toEqual([['notes', 'one']]);
    });

    it('writes only the last edit of a key, once, when the edits come inside the pause', () => {
        const written: Written[] = [];
        const writes = writingTo(written);

        writes.schedule('notes', 'one');
        vi.advanceTimersByTime(AFTER_THE_PAUSE - 200);
        writes.schedule('notes', 'two');
        vi.advanceTimersByTime(AFTER_THE_PAUSE - 200);

        expect(written).toEqual([]);

        vi.advanceTimersByTime(AFTER_THE_PAUSE);

        expect(written).toEqual([['notes', 'two']]);
    });

    it('waits the pause it was given, when one keystroke is not the end of the typing', () => {
        const written: string[] = [];
        const writes = createPendingWrites<string, string>((_key, text) => {
            written.push(text);

            return Promise.resolve();
        }, 60_000);

        writes.schedule('script', 'one');
        vi.advanceTimersByTime(59_999);

        expect(written).toEqual([]);

        vi.advanceTimersByTime(1);

        expect(written).toEqual(['one']);
    });

    it('says what a key waits to write until it is written', () => {
        const writes = writingTo([]);

        writes.schedule('notes', 'one');

        expect([writes.waiting('notes'), writes.waiting('other')]).toEqual(['one', undefined]);

        vi.advanceTimersByTime(AFTER_THE_PAUSE);

        expect(writes.waiting('notes')).toBeUndefined();
    });

    it('drops an edit it is told to, so nothing lands after the pause', () => {
        const written: Written[] = [];
        const writes = writingTo(written);

        writes.schedule('notes', 'one');
        writes.cancel('notes');
        vi.advanceTimersByTime(AFTER_THE_PAUSE);

        expect(written).toEqual([]);
    });

    it('writes one key now and leaves the others to their pause', async () => {
        const written: Written[] = [];
        const writes = writingTo(written);

        writes.schedule('notes', 'one');
        writes.schedule('todo', 'two');
        await writes.flush('notes');

        expect(written).toEqual([['notes', 'one']]);

        vi.advanceTimersByTime(AFTER_THE_PAUSE);

        expect(written).toEqual([
            ['notes', 'one'],
            ['todo', 'two'],
        ]);
    });

    it('writes now every key that matches, and answers once each write is done', async () => {
        const done: string[] = [];
        const writes = createPendingWrites<string, string>(async (key) => {
            await Promise.resolve();
            done.push(key);
        });

        writes.schedule('pay/prod', 'a');
        writes.schedule('pay/dev', 'b');
        writes.schedule('other/prod', 'c');
        await writes.flushWhere((key) => key.startsWith('pay/'));

        expect(done.toSorted()).toEqual(['pay/dev', 'pay/prod']);
        expect(writes.waiting('other/prod')).toBe('c');
    });

    /** The window is about to close, or to leave its origin: nothing typed may stay behind. */
    it('writes now what every kind of file waits to write', async () => {
        const written: Written[] = [];
        const docs = writingTo(written);
        const variables = writingTo(written);

        docs.schedule('notes', 'one');
        variables.schedule('payments', 'two');
        await settlePendingWrites();

        expect(written.toSorted()).toEqual([
            ['notes', 'one'],
            ['payments', 'two'],
        ]);
    });

    /** Settled before the origin is left, so what still waits was typed on the way out. */
    it('drops what waits when the origin is left, so it never lands in the next one', () => {
        const written: Written[] = [];
        const writes = writingTo(written);

        writes.schedule('notes', 'one');
        dropOriginState();
        vi.advanceTimersByTime(AFTER_THE_PAUSE);

        expect([written, writes.waiting('notes')]).toEqual([[], undefined]);
    });

    it('spends nothing flushing a key that waits for nothing', async () => {
        const written: Written[] = [];

        await writingTo(written).flush('notes');

        expect(written).toEqual([]);
    });
});
