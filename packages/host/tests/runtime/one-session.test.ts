import { describe, expect, it, vi } from 'vitest';

import { createOneSession } from '../../src/runtime/one-session.js';

describe('the one window of a running app', () => {
    it('opens a session and hands back the one that is open', async () => {
        const session = createOneSession(() => Promise.resolve('first'), vi.fn());

        await session.open();

        expect(session.current()).toBe('first');
    });

    it('does not open a second session while one is open', async () => {
        const start = vi.fn(() => Promise.resolve('only'));
        const session = createOneSession(start, vi.fn());

        await session.open();
        await session.open();

        expect(start).toHaveBeenCalledOnce();
    });

    /** Two clicks on the dock icon before the first window is up are still one window. */
    it('does not open a second session while the first is on its way', async () => {
        const start = vi.fn(() => Promise.resolve('only'));
        const session = createOneSession(start, vi.fn());

        await Promise.all([session.open(), session.open()]);

        expect(start).toHaveBeenCalledOnce();
    });

    it('closes the open session once, and opens a new one after it', async () => {
        const stop = vi.fn();
        const opened = ['first', 'second'];
        const session = createOneSession(() => Promise.resolve(opened.shift() ?? ''), stop);

        await session.open();
        session.close();
        session.close();
        await session.open();

        expect(stop).toHaveBeenCalledExactlyOnceWith('first');
        expect(session.current()).toBe('second');
    });

    it('lets a session that failed to open be asked for again', async () => {
        const start = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new Error('the disk said no'))
            .mockResolvedValueOnce('after');
        const session = createOneSession(start, vi.fn());

        await expect(session.open()).rejects.toThrow('the disk said no');
        await session.open();

        expect(session.current()).toBe('after');
    });
});
