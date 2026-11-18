import type { OriginSyncStateName } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { announceCommitted } from '../../src/repo/commit-events.js';
import { startSyncLoop, type SyncLoop } from '../../src/sync/sync-loop.js';
import { onSyncStateChanged, syncStateOf } from '../../src/sync/sync-state.js';

import { gated, remote, ROOT, TIMING } from './loop-support.js';

let loop: SyncLoop | null = null;

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    loop?.dispose();
    loop = null;
    vi.useRealTimers();
});

describe('the loop that keeps an origin in step with its remote', () => {
    it('takes a step when it starts, saying it works and then where it stands', async () => {
        const heard: unknown[] = [];
        const stop = onSyncStateChanged((_root, state) => heard.push(state));
        const step = vi.fn(() => Promise.resolve<OriginSyncStateName>('clean'));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        stop();

        expect(step).toHaveBeenCalledTimes(1);
        expect(heard).toEqual([
            { state: 'clean', busy: true },
            { state: 'clean', busy: false },
        ]);
    });

    it('takes another step after every commit of its repo, and none after somebody else', async () => {
        const step = vi.fn(() => Promise.resolve<OriginSyncStateName>('clean'));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        announceCommitted('/repo/other');
        await vi.advanceTimersByTimeAsync(0);
        announceCommitted(ROOT);
        await vi.advanceTimersByTimeAsync(0);

        expect(step).toHaveBeenCalledTimes(2);
    });

    it('takes a step every interval', async () => {
        const step = vi.fn(() => Promise.resolve<OriginSyncStateName>('clean'));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(TIMING.intervalMs * 2);

        expect(step).toHaveBeenCalledTimes(3);
    });

    it('takes a step when asked, as when the window took the focus', async () => {
        const step = vi.fn(() => Promise.resolve<OriginSyncStateName>('clean'));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        loop.request();
        await vi.advanceTimersByTimeAsync(0);

        expect(step).toHaveBeenCalledTimes(2);
    });

    it('never runs two steps together: what is asked meanwhile makes one more after', async () => {
        const gate = gated();
        const step = vi.fn(gate.step);

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        loop.request();
        loop.request();
        announceCommitted(ROOT);
        await vi.advanceTimersByTimeAsync(0);

        expect(step).toHaveBeenCalledTimes(1);

        gate.open('clean');
        await vi.advanceTimersByTimeAsync(0);

        expect(step).toHaveBeenCalledTimes(2);

        gate.open('clean');
        await vi.advanceTimersByTimeAsync(0);

        expect(step).toHaveBeenCalledTimes(2);
        expect(syncStateOf(ROOT)).toEqual({ state: 'clean', busy: false });
    });

    it('keeps the state it had while a step runs, so the window does not lose where it stood', async () => {
        const gate = gated();
        const step = vi.fn(() => Promise.resolve<OriginSyncStateName>('conflict'));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        step.mockImplementation(gate.step);
        loop.request();
        await vi.advanceTimersByTimeAsync(0);

        expect(syncStateOf(ROOT)).toEqual({ state: 'conflict', busy: true });

        gate.open('clean');
        await vi.advanceTimersByTimeAsync(0);
    });
});
