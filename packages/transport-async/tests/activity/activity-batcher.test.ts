import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ActivityRecord } from '../../src/index.js';
import { ActivityBatcher } from '../../src/activity/activity-batcher.js';

function record(data: string): ActivityRecord {
    return { direction: 'in', data, at: 0 };
}

describe('ActivityBatcher', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('emits as soon as the batch size is reached', () => {
        vi.useFakeTimers();
        const batches: ActivityRecord[][] = [];
        const batcher = new ActivityBatcher((records) => batches.push(records), 3, 60_000, 10);

        batcher.record(record('a'));
        batcher.record(record('b'));
        batcher.record(record('c'));

        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(3);
        batcher.dispose();
    });

    it('emits a partial batch when the window closes', async () => {
        vi.useFakeTimers();
        const batches: ActivityRecord[][] = [];
        const batcher = new ActivityBatcher((records) => batches.push(records), 100, 50, 1000);

        batcher.record(record('a'));
        await vi.advanceTimersByTimeAsync(50);

        expect(batches).toHaveLength(1);
        expect(batches[0]?.map((entry) => entry.data)).toEqual(['a']);
        batcher.dispose();
    });

    it('does not emit twice when the size flush already fired', async () => {
        vi.useFakeTimers();
        const batches: ActivityRecord[][] = [];
        const batcher = new ActivityBatcher((records) => batches.push(records), 2, 50, 10);

        batcher.record(record('a'));
        batcher.record(record('b'));
        await vi.advanceTimersByTimeAsync(1_000);

        expect(batches).toHaveLength(1);
        batcher.dispose();
    });

    it('emits nothing when flushed empty', () => {
        vi.useFakeTimers();
        const batches: ActivityRecord[][] = [];
        const batcher = new ActivityBatcher((records) => batches.push(records), 100, 50, 1000);

        batcher.flush();

        expect(batches).toHaveLength(0);
        batcher.dispose();
    });

    it('leaves no timer behind after dispose', async () => {
        vi.useFakeTimers();
        const batches: ActivityRecord[][] = [];
        const batcher = new ActivityBatcher((records) => batches.push(records), 100, 60_000, 1000);

        batcher.record(record('a'));
        expect(vi.getTimerCount()).toBe(1);

        batcher.dispose();

        expect(vi.getTimerCount()).toBe(0);
        await vi.advanceTimersByTimeAsync(120_000);
        expect(batches).toHaveLength(0);
    });
});
