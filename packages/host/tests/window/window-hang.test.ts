import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchWindow, type WatchedWindow } from './support/watched-window.js';

let watched: WatchedWindow;

beforeEach(() => {
    vi.useFakeTimers();
    watched = watchWindow();
});

afterEach(() => {
    watched.stop();
    vi.useRealTimers();
});

describe('a window that stopped answering', () => {
    it('is left alone for ten seconds, and then the person is asked', async () => {
        watched.contents.emit('unresponsive');
        await vi.advanceTimersByTimeAsync(9_999);

        expect(watched.asked).toEqual([]);

        await vi.advanceTimersByTimeAsync(1);

        expect(watched.asked).toEqual([
            { buttons: ['wait', 'reload'], detail: 'hungDetail', title: 'hungTitle' },
        ]);
        expect(watched.reload).not.toHaveBeenCalled();
    });

    it('is reloaded when the person chooses to', async () => {
        watched.answer = 1;
        watched.contents.emit('unresponsive');
        await vi.advanceTimersByTimeAsync(10_000);

        expect(watched.reload).toHaveBeenCalledOnce();
    });

    it('is not asked about when it answers before the ten seconds', async () => {
        watched.contents.emit('unresponsive');
        await vi.advanceTimersByTimeAsync(5_000);
        watched.contents.emit('responsive');
        await vi.advanceTimersByTimeAsync(10_000);

        expect(watched.asked).toEqual([]);
        expect(watched.logged.map(([level]) => level)).toEqual(['warn', 'info']);
    });

    it('ignores the answer of a question that came after the window recovered', async () => {
        watched.answer = -1;
        watched.contents.emit('unresponsive');
        await vi.advanceTimersByTimeAsync(10_000);
        watched.contents.emit('responsive');
        watched.reply?.(1);
        await vi.advanceTimersByTimeAsync(0);

        expect(watched.asked).toHaveLength(1);
        expect(watched.reload).not.toHaveBeenCalled();
    });
});
