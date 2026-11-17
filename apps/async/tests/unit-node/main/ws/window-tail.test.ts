import { ACTIVITY_WINDOW_BYTES, ACTIVITY_WINDOW_ENTRIES, type ActivityRecord } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { windowTail } from '../../../../src/main/ws/window-tail.js';

function text(at: number, length: number): ActivityRecord {
    return { at, data: 'x'.repeat(length), direction: 'in' };
}

function bytes(at: number, decoded: number): ActivityRecord {
    return { at, binary: true, data: Buffer.alloc(decoded).toString('base64'), direction: 'in' };
}

/** What the window weighs a frame at: its UTF-8 bytes, or the bytes its base64 carries. */
function windowWeight(record: ActivityRecord): number {
    return record.binary === true
        ? Buffer.from(record.data, 'base64').length
        : Buffer.byteLength(record.data, 'utf8');
}

/** The frames of a batch alone the window holds after it: its newest, under both caps. */
function windowKeeps(records: readonly ActivityRecord[]): ActivityRecord[] {
    const kept: ActivityRecord[] = [];
    let held = 0;

    for (const record of records.toReversed()) {
        held += windowWeight(record);

        if (
            kept.length > 0 &&
            (kept.length >= ACTIVITY_WINDOW_ENTRIES || held > ACTIVITY_WINDOW_BYTES)
        ) {
            break;
        }

        kept.unshift(record);
    }

    return kept;
}

/** The window keeps the last two megabytes of a timeline: main sends no more than that. */
describe('the tail of a batch the window keeps', () => {
    it('sends a batch within what the window keeps as it came', () => {
        const batch = [text(1, 10), text(2, 10)];

        expect(windowTail(batch)).toBe(batch);
    });

    it('leaves out the front of a batch heavier than what the window keeps', () => {
        const heavy = ACTIVITY_WINDOW_BYTES / 4;
        const batch = Array.from({ length: 10 }, (_, index) => text(index, heavy));

        const sent = windowTail(batch);

        expect(sent.map((each) => each.at)).toEqual([6, 7, 8, 9]);
    });

    it('always sends the newest frame, even one larger than all the window keeps', () => {
        const batch = [text(1, 10), text(2, ACTIVITY_WINDOW_BYTES * 2)];

        expect(windowTail(batch).map((each) => each.at)).toEqual([2]);
    });

    /**
     * What main leaves out the window would have dropped anyway: main never weighs a frame more
     * than the window does, so whatever the window keeps of the batch is still in it.
     */
    it('keeps at least the frames the window would keep, in UTF-8 and in base64', () => {
        const wide = 'é'.repeat(ACTIVITY_WINDOW_BYTES / 8);
        const batch = [
            ...Array.from({ length: 6 }, (_, index) => ({ ...text(index, 0), data: wide })),
            ...Array.from({ length: 6 }, (_, index) =>
                bytes(10 + index, ACTIVITY_WINDOW_BYTES / 8),
            ),
        ];

        const sent = windowTail(batch);
        const kept = windowKeeps(batch);

        expect(kept).toHaveLength(7);
        expect(sent.slice(-kept.length)).toEqual(kept);
        expect(sent.length).toBeLessThan(batch.length);
    });

    it('sends no more frames than the window keeps', () => {
        const batch = Array.from({ length: ACTIVITY_WINDOW_ENTRIES + 20 }, (_, index) =>
            text(index, 1),
        );

        const sent = windowTail(batch);

        expect(sent).toHaveLength(ACTIVITY_WINDOW_ENTRIES);
        expect(sent.at(-1)?.at).toBe(ACTIVITY_WINDOW_ENTRIES + 19);
    });
});
