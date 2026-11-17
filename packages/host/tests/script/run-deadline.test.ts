import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startRunDeadline } from '../../src/script/run-deadline.js';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('a run deadline', () => {
    it('fires once the time passes, and only once', () => {
        const expire = vi.fn();

        startRunDeadline(100, expire);
        vi.advanceTimersByTime(99);

        expect(expire).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        vi.advanceTimersByTime(1_000);

        expect(expire).toHaveBeenCalledTimes(1);
    });

    it('does not count the time it is paused', () => {
        const expire = vi.fn();
        const deadline = startRunDeadline(100, expire);

        vi.advanceTimersByTime(60);
        deadline.pause();
        vi.advanceTimersByTime(10_000);

        expect(expire).not.toHaveBeenCalled();

        deadline.resume();
        vi.advanceTimersByTime(39);

        expect(expire).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);

        expect(expire).toHaveBeenCalledTimes(1);
    });

    it('adds the stretches it ran between pauses', () => {
        const expire = vi.fn();
        const deadline = startRunDeadline(100, expire);

        vi.advanceTimersByTime(40);
        deadline.pause();
        deadline.resume();
        vi.advanceTimersByTime(40);
        deadline.pause();
        deadline.resume();
        vi.advanceTimersByTime(19);

        expect(expire).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);

        expect(expire).toHaveBeenCalledTimes(1);
    });

    it('takes a second pause as no change', () => {
        const expire = vi.fn();
        const deadline = startRunDeadline(100, expire);

        vi.advanceTimersByTime(50);
        deadline.pause();
        vi.advanceTimersByTime(50);
        deadline.pause();
        deadline.resume();
        vi.advanceTimersByTime(49);

        expect(expire).not.toHaveBeenCalled();
    });

    it('takes a resume of a running deadline as no change', () => {
        const expire = vi.fn();
        const deadline = startRunDeadline(100, expire);

        vi.advanceTimersByTime(60);
        deadline.resume();
        vi.advanceTimersByTime(40);

        expect(expire).toHaveBeenCalledTimes(1);
    });

    it('never fires after it was cleared, paused or running', () => {
        const running = vi.fn();
        const paused = vi.fn();
        const first = startRunDeadline(100, running);
        const second = startRunDeadline(100, paused);

        second.pause();
        first.clear();
        second.clear();
        second.resume();
        vi.advanceTimersByTime(10_000);

        expect(running).not.toHaveBeenCalled();
        expect(paused).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('does not rearm after it fired', () => {
        const expire = vi.fn();
        const deadline = startRunDeadline(100, expire);

        vi.advanceTimersByTime(100);
        deadline.resume();
        vi.advanceTimersByTime(1_000);

        expect(expire).toHaveBeenCalledTimes(1);
    });
});
