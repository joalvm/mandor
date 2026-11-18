import { describe, expect, it, vi } from 'vitest';

import { watchAborts } from '../../src/send/abort-watch.js';

describe('watchAborts', () => {
    it('remembers the caller arm when the caller aborts first', () => {
        const controller = new AbortController();
        const watch = watchAborts(controller.signal, 5_000);

        controller.abort();

        expect(watch.source()).toBe('user');
        expect(watch.combined.aborted).toBe(true);
    });

    it('remembers the total arm when the clock fires first', async () => {
        const watch = watchAborts(new AbortController().signal, 5);

        await new Promise((resolve) => {
            watch.combined.addEventListener('abort', resolve, { once: true });
        });

        expect(watch.source()).toBe('total');
        expect(watch.combined.aborted).toBe(true);
    });

    it('answers none while nothing has aborted', () => {
        const watch = watchAborts(new AbortController().signal, 5_000);

        expect(watch.source()).toBe('none');
        expect(watch.combined.aborted).toBe(false);
    });

    /** A send that is over holds nothing: no clock left counting, no ear on the caller's signal. */
    it('leaves no clock and no listener behind once stopped', () => {
        vi.useFakeTimers();

        try {
            const controller = new AbortController();
            const watch = watchAborts(controller.signal, 5_000);

            expect(vi.getTimerCount()).toBe(1);

            watch.stop();
            controller.abort();
            vi.advanceTimersByTime(5_000);

            expect(vi.getTimerCount()).toBe(0);
            expect(watch.source()).toBe('none');
        } finally {
            vi.useRealTimers();
        }
    });
});
