import { getEventListeners } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { newWorkerSlots } from '../../src/script/worker-slots.js';

type Fake = { id: number; alive: boolean; terminate: Mock<() => void> };

function newPool(limit = 2, idleMs = 1_000) {
    const made: Fake[] = [];
    const slots = newWorkerSlots<Fake>({
        create: () => {
            const fake: Fake = { id: made.length, alive: true, terminate: vi.fn<() => void>() };

            made.push(fake);

            return fake;
        },
        limit,
        idleMs,
        isAlive: (worker) => worker.alive,
    });

    return { made, slots };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('worker slots', () => {
    it('makes a worker per acquire up to the limit', async () => {
        const { made, slots } = newPool(2);

        await slots.acquire();
        await slots.acquire();

        expect(made).toHaveLength(2);
    });

    it('hands a released worker to the next acquire instead of making one', async () => {
        const { made, slots } = newPool(2);
        const first = await slots.acquire();

        slots.release(first, { reuse: true });

        expect(await slots.acquire()).toBe(first);
        expect(made).toHaveLength(1);
    });

    it('makes the caller wait at the limit, and serves the waiters in order', async () => {
        const { made, slots } = newPool(1);
        const first = await slots.acquire();
        const order: string[] = [];
        const second = slots.acquire().then((worker) => {
            order.push('second');

            return worker;
        });
        const third = slots.acquire().then((worker) => {
            order.push('third');

            return worker;
        });

        slots.release(first, { reuse: true });
        slots.release(await second, { reuse: true });
        await third;

        expect(order).toEqual(['second', 'third']);
        expect(made).toHaveLength(1);
    });

    it('ends a worker that is not reused, and gives a fresh one to the waiter', async () => {
        const { made, slots } = newPool(1);
        const first = await slots.acquire();
        const waiting = slots.acquire();

        slots.release(first, { reuse: false });

        const second = await waiting;

        expect(first.terminate).toHaveBeenCalledTimes(1);
        expect(second).not.toBe(first);
        expect(made).toHaveLength(2);
    });

    it('frees the slot of a worker that is not reused', async () => {
        const { made, slots } = newPool(1);
        const first = await slots.acquire();

        slots.release(first, { reuse: false });
        await slots.acquire();

        expect(made).toHaveLength(2);
    });

    it('ends a released worker that is no longer alive', async () => {
        const { slots } = newPool(1);
        const first = await slots.acquire();

        first.alive = false;
        slots.release(first, { reuse: true });

        expect(first.terminate).toHaveBeenCalledTimes(1);
    });

    it('skips a parked worker that died, and ends it', async () => {
        const { made, slots } = newPool(1);
        const first = await slots.acquire();

        slots.release(first, { reuse: true });
        first.alive = false;

        const second = await slots.acquire();

        expect(second).not.toBe(first);
        expect(first.terminate).toHaveBeenCalledTimes(1);
        expect(made).toHaveLength(2);
    });

    it('closes an idle worker after the idle time and frees its slot', async () => {
        const { made, slots } = newPool(1, 1_000);
        const first = await slots.acquire();

        slots.release(first, { reuse: true });
        vi.advanceTimersByTime(999);

        expect(first.terminate).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);

        expect(first.terminate).toHaveBeenCalledTimes(1);

        await slots.acquire();

        expect(made).toHaveLength(2);
    });

    it('does not close a worker that was taken again before the idle time', async () => {
        const { slots } = newPool(1, 1_000);
        const first = await slots.acquire();

        slots.release(first, { reuse: true });
        vi.advanceTimersByTime(900);
        await slots.acquire();
        vi.advanceTimersByTime(5_000);

        expect(first.terminate).not.toHaveBeenCalled();
    });

    it('arms one timer for a parked worker', async () => {
        const { slots } = newPool(1, 1_000);
        const first = await slots.acquire();

        slots.release(first, { reuse: true });

        expect(vi.getTimerCount()).toBe(1);
    });

    it('refuses an acquire whose signal is already aborted, without making a worker', async () => {
        const { made, slots } = newPool(1);
        const controller = new AbortController();

        controller.abort();

        await expect(slots.acquire(controller.signal)).rejects.toThrow(/cancelled/u);
        expect(made).toHaveLength(0);
    });

    it('lets a waiter leave the queue when its signal aborts', async () => {
        const { made, slots } = newPool(1);
        const first = await slots.acquire();
        const controller = new AbortController();
        const waiting = slots.acquire(controller.signal);

        controller.abort();

        await expect(waiting).rejects.toThrow(/cancelled/u);

        slots.release(first, { reuse: true });

        expect(await slots.acquire()).toBe(first);
        expect(made).toHaveLength(1);
    });

    it('ignores the signal of a waiter that was already served', async () => {
        const { slots } = newPool(1);
        const first = await slots.acquire();
        const controller = new AbortController();
        const waiting = slots.acquire(controller.signal);

        slots.release(first, { reuse: true });

        const served = await waiting;

        controller.abort();

        expect(served).toBe(first);
    });

    it('ends the parked workers and the timers on close, and refuses what comes after', async () => {
        const { slots } = newPool(2);
        const first = await slots.acquire();
        const second = await slots.acquire();

        slots.release(first, { reuse: true });
        slots.close();

        expect(first.terminate).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
        await expect(slots.acquire()).rejects.toThrow(/closed/u);

        slots.release(second, { reuse: true });

        expect(second.terminate).toHaveBeenCalledTimes(1);
    });

    it('rejects the waiters on close', async () => {
        const { slots } = newPool(1);

        await slots.acquire();

        const waiting = slots.acquire();

        slots.close();

        await expect(waiting).rejects.toThrow(/closed/u);
    });

    it('stops listening to the signal of a waiter it rejected on close', async () => {
        const { slots } = newPool(1);
        const controller = new AbortController();

        await slots.acquire();

        const waiting = slots.acquire(controller.signal);

        slots.close();

        await expect(waiting).rejects.toThrow(/closed/u);
        expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    });
});
