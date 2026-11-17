import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventNote } from '../../../../src/main/ws/event-note.js';
import {
    newMessageScriptQueue,
    queuedMessageOf,
    type MessageQueueDeps,
    type QueuedMessage,
} from '../../../../src/main/ws/message-script-queue.js';

// The queue of `onMessage`: bounded per connection, never in the way of the socket. The clock is
// the test's: the note of a second and the rest of a quiet connection are times, not waits.

type Held = { message: QueuedMessage; release: () => void };

function noteOf(connectionId: string, text: string): EventNote {
    return {
        connectionId,
        event: 'onMessage',
        at: 0,
        logs: [{ level: 'log', text }],
        tests: [],
        skipped: [],
        dropped: 0,
        switchedOff: 0,
        variables: [],
        withheld: [],
    };
}

/** Runs that wait until the test lets them go; after that, every run ends at once. */
function heldRuns() {
    const held: Held[] = [];
    const ran: QueuedMessage[] = [];
    const signals: AbortSignal[] = [];
    let free = false;
    const run: MessageQueueDeps['run'] = (connectionId, message, signal) =>
        new Promise((resolve) => {
            signals.push(signal);

            function release(): void {
                ran.push(message);
                resolve(noteOf(connectionId, message.text ?? '(no text)'));
            }

            if (free) {
                release();

                return;
            }

            held.push({ message, release });
        });

    function letGo(): void {
        free = true;

        for (const one of held.splice(0)) {
            one.release();
        }
    }

    return { held, ran, signals, run, letGo };
}

const notes: EventNote[] = [];

function say(note: EventNote): void {
    notes.push(note);
}

function texts(list: readonly QueuedMessage[]): (string | undefined)[] {
    return list.map((message) => message.text);
}

function dropped(): number {
    return notes.reduce((sum, note) => sum + note.dropped, 0);
}

/** What the notes said: a line a script wrote, or the code of what main said. */
function lines(): string[] {
    return notes.flatMap((note) => note.logs).map((log) => ('text' in log ? log.text : log.notice));
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    notes.length = 0;
});

describe('the frame an onMessage reads', () => {
    it('reads a text, and no text for bytes or for a text over what a script may read', () => {
        expect(queuedMessageOf({ data: 'hola', event: 'chat' })).toEqual({
            text: 'hola',
            binary: false,
            event: 'chat',
            bytes: 4,
            tooLarge: false,
        });
        expect(queuedMessageOf({ data: 'AAEC', binary: true })).toMatchObject({
            text: undefined,
            binary: true,
            tooLarge: false,
        });
        expect(queuedMessageOf({ data: 'ñandú' }, 4)).toMatchObject({
            text: undefined,
            bytes: 7,
            tooLarge: true,
        });
    });
});

describe('the queue of a connection', () => {
    it('runs each frame in order, one at a time', async () => {
        const { held, ran, run, letGo } = heldRuns();
        const queue = newMessageScriptQueue({ run, say });

        queue.push('echo', { data: 'a' });
        queue.push('echo', { data: 'b' });

        expect(held).toHaveLength(1);
        letGo();
        await vi.advanceTimersByTimeAsync(0);

        expect(texts(ran)).toEqual(['a', 'b']);
        queue.closeAll();
    });

    it('drops a frame over the count, never waits, and the next run says how many', async () => {
        const { held, ran, run, letGo } = heldRuns();
        const queue = newMessageScriptQueue({ run, say, limits: { messageQueue: 2 } });

        for (let index = 0; index < 10_000; index += 1) {
            queue.push('echo', { data: String(index) });
        }

        // One runs and two wait; the push came back each time without waiting for a script.
        expect(held).toHaveLength(1);
        letGo();
        await vi.advanceTimersByTimeAsync(0);
        queue.close('echo');

        expect(texts(ran)).toEqual(['0', '1', '2']);
        expect(dropped()).toBe(9_997);
        expect(notes.flatMap((note) => note.logs)).toContainEqual({
            level: 'warn',
            notice: 'queue-full',
            params: { count: 9_997 },
        });
    });

    it('drops a frame over the bytes the queue holds', async () => {
        const { ran, run, letGo } = heldRuns();
        const mib = 'x'.repeat(1024 * 1024);
        const queue = newMessageScriptQueue({
            run,
            say,
            limits: { messageQueueBytes: 8 * 1024 * 1024 },
        });

        for (let index = 0; index < 20; index += 1) {
            queue.push('echo', { data: mib });
        }

        letGo();
        await vi.advanceTimersByTimeAsync(0);
        queue.close('echo');

        // One ran at once, eight fit the bytes behind it.
        expect(ran).toHaveLength(9);
        expect(dropped()).toBe(11);
    });

    it('keeps the connections apart: a full one drops nothing of another', async () => {
        const { held, run, letGo } = heldRuns();
        const queue = newMessageScriptQueue({ run, say, limits: { messageQueue: 1 } });

        queue.push('one', { data: 'a' });
        queue.push('one', { data: 'b' });
        queue.push('one', { data: 'c' });
        queue.push('two', { data: 'z' });

        expect(texts(held.map((one) => one.message))).toEqual(['a', 'z']);
        letGo();
        await vi.advanceTimersByTimeAsync(0);
        queue.closeAll();

        const two = notes.filter((note) => note.connectionId === 'two');

        expect(two.map((note) => note.dropped)).toEqual([0]);
    });

    it('says the runs of a second in one note', async () => {
        const { run, letGo } = heldRuns();
        const queue = newMessageScriptQueue({ run, say });

        letGo();
        queue.push('echo', { data: 'a' });
        queue.push('echo', { data: 'b' });
        await vi.advanceTimersByTimeAsync(999);

        expect(notes).toEqual([]);

        await vi.advanceTimersByTimeAsync(1);

        expect(notes).toHaveLength(1);
        expect(lines()).toEqual(['a', 'b']);
        queue.closeAll();
    });

    it('says when a script ran without the text of a frame too large for it', async () => {
        const { run, letGo } = heldRuns();
        const queue = newMessageScriptQueue({ run, say, limits: { payloadBytes: 2 } });

        letGo();
        queue.push('echo', { data: 'long' });
        await vi.advanceTimersByTimeAsync(0);
        queue.close('echo');

        expect(lines()).toEqual(['message-too-large', '(no text)']);
    });

    it('lets go of a quiet connection after workerIdleMs, and the next frame runs', async () => {
        const { ran, signals, run, letGo } = heldRuns();
        const queue = newMessageScriptQueue({ run, say, limits: { workerIdleMs: 20 } });

        letGo();
        queue.push('echo', { data: 'a' });
        await vi.advanceTimersByTimeAsync(19);

        expect(signals[0]?.aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(1);

        expect(signals[0]?.aborted).toBe(true);
        expect(notes).toHaveLength(1);

        queue.push('echo', { data: 'b' });
        await vi.advanceTimersByTimeAsync(0);

        expect(texts(ran)).toEqual(['a', 'b']);
        expect(signals[1]?.aborted).toBe(false);
        queue.closeAll();
    });

    it('empties on close, cuts the run in flight and says what it gathered', async () => {
        const { held, ran, signals, run } = heldRuns();
        const queue = newMessageScriptQueue({ run, say, limits: { messageQueue: 1 } });

        queue.push('echo', { data: 'a' });
        queue.push('echo', { data: 'b' });
        queue.push('echo', { data: 'c' });
        queue.close('echo');

        expect(signals[0]?.aborted).toBe(true);
        expect(notes).toEqual([expect.objectContaining({ dropped: 1 })]);

        held.shift()?.release();
        await vi.advanceTimersByTimeAsync(2_000);

        expect(texts(ran)).toEqual(['a']);
        expect(held).toHaveLength(0);
        expect(notes).toHaveLength(1);
    });

    it('says on close the frames dropped before the run it cut, which was to say them', async () => {
        const { held, run } = heldRuns();
        const queue = newMessageScriptQueue({ run, say, limits: { messageQueue: 1 } });

        queue.push('echo', { data: 'a' });
        queue.push('echo', { data: 'b' });
        queue.push('echo', { data: 'c' });
        held.shift()?.release();
        await vi.advanceTimersByTimeAsync(0);

        // `b` runs now, holding the count of `c`; the close cuts it before it says so.
        expect(held).toHaveLength(1);
        queue.close('echo');

        expect(dropped()).toBe(1);
    });
});
