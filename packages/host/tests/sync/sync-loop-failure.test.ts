import type { OriginSyncStateName } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { announceCommitted } from '../../src/repo/commit-events.js';
import { startSyncLoop, type SyncLoop } from '../../src/sync/sync-loop.js';
import { syncStateOf } from '../../src/sync/sync-state.js';

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

describe('the loop when a step fails, and when it ends', () => {
    it('says error when a step fails, and tries again after a wait that doubles up to a ceiling', async () => {
        const step = vi.fn(() => Promise.reject<OriginSyncStateName>(new Error('no network')));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);

        expect(syncStateOf(ROOT)).toEqual({ state: 'error', busy: false });
        expect(step).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(4_999);
        expect(step).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(step).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(10_000);
        expect(step).toHaveBeenCalledTimes(3);

        await vi.advanceTimersByTimeAsync(20_000);
        expect(step).toHaveBeenCalledTimes(4);

        await vi.advanceTimersByTimeAsync(20_000);
        expect(step).toHaveBeenCalledTimes(5);
    });

    it('starts the wait over from a step that worked', async () => {
        const step = vi.fn(() => Promise.reject<OriginSyncStateName>(new Error('no network')));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(5_000);
        await vi.advanceTimersByTimeAsync(10_000);

        expect(step).toHaveBeenCalledTimes(3);

        step.mockImplementationOnce(() => Promise.resolve<OriginSyncStateName>('clean'));
        await vi.advanceTimersByTimeAsync(20_000);

        expect(syncStateOf(ROOT)).toEqual({ state: 'clean', busy: false });

        step.mockImplementation(() => Promise.reject(new Error('down again')));
        loop.request();
        await vi.advanceTimersByTimeAsync(5_000);

        expect(step).toHaveBeenCalledTimes(6);
    });

    it('stops everything on dispose, forgets the state and ignores a step still in the air', async () => {
        const gate = gated();
        const step = vi.fn(gate.step);

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        loop.dispose();
        gate.open('clean');
        await vi.advanceTimersByTimeAsync(TIMING.intervalMs * 2);
        announceCommitted(ROOT);
        loop.request();
        await vi.advanceTimersByTimeAsync(0);

        expect(step).toHaveBeenCalledTimes(1);
        expect(syncStateOf(ROOT)).toBeNull();
    });

    it('drops a retry that was waiting when it is disposed', async () => {
        const step = vi.fn(() => Promise.reject<OriginSyncStateName>(new Error('no network')));

        loop = startSyncLoop(remote(), step, TIMING);
        await vi.advanceTimersByTimeAsync(0);
        loop.dispose();
        await vi.advanceTimersByTimeAsync(TIMING.retryMaxMs * 3);

        expect(step).toHaveBeenCalledTimes(1);
    });

    it('tells the local origin it has nothing to follow and takes no step', async () => {
        const step = vi.fn(() => Promise.resolve<OriginSyncStateName>('clean'));

        loop = startSyncLoop({ root: ROOT, kind: 'local' }, step, TIMING);
        loop.request();
        await vi.advanceTimersByTimeAsync(TIMING.intervalMs * 2);

        expect(step).not.toHaveBeenCalled();
        expect(syncStateOf(ROOT)).toEqual({ state: 'local-only', busy: false });

        loop.dispose();

        expect(syncStateOf(ROOT)).toBeNull();
    });
});
