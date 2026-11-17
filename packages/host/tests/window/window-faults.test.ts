import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchWindow, type WatchedWindow } from './support/watched-window.js';

const GONE = { exitCode: 133, reason: 'crashed' };

let watched: WatchedWindow;

function crash(details = GONE): void {
    watched.contents.emit('render-process-gone', {}, details);
}

beforeEach(() => {
    vi.useFakeTimers();
    watched = watchWindow();
});

afterEach(() => {
    watched.stop();
    vi.useRealTimers();
});

describe('a window whose process died', () => {
    it('is reloaded once, written down, and the person is told', () => {
        crash();

        expect(watched.reload).toHaveBeenCalledOnce();
        expect(watched.logged).toEqual([
            ['error', 'render-process-gone: reason crashed, exit code 133'],
        ]);
        expect(watched.raised).toEqual([['window-restarted', 'warning', 'window-restarted']]);
        expect(watched.asked).toEqual([]);
    });

    it('is left alone when it left cleanly', () => {
        crash({ exitCode: 0, reason: 'clean-exit' });

        expect(watched.reload).not.toHaveBeenCalled();
        expect(watched.raised).toEqual([]);
    });

    it('asks instead of reloading when it dies again within a minute', async () => {
        watched.answer = -1;
        crash();
        watched.clock += 59_000;
        crash();
        await vi.advanceTimersByTimeAsync(0);

        expect(watched.reload).toHaveBeenCalledOnce();
        expect(watched.asked).toEqual([
            {
                buttons: ['reopen', 'quit'],
                detail: 'crashedAgainDetail',
                title: 'crashedAgainTitle',
            },
        ]);
    });

    it('reloads again when asked to reopen, and quits when asked to quit', async () => {
        crash();
        watched.clock += 1_000;
        crash();
        await vi.advanceTimersByTimeAsync(0);

        expect(watched.reload).toHaveBeenCalledTimes(2);

        watched.answer = 1;
        watched.clock += 1_000;
        crash();
        await vi.advanceTimersByTimeAsync(0);

        expect(watched.quit).toHaveBeenCalledOnce();
    });

    it('is reloaded again when the last death was more than a minute ago', () => {
        crash();
        watched.clock += 61_000;
        crash();

        expect(watched.reload).toHaveBeenCalledTimes(2);
        expect(watched.asked).toEqual([]);
    });
});

describe('a process of the app that is not the window', () => {
    it('is written down with its type and its reason, and nothing else happens', () => {
        watched.app.emit(
            'child-process-gone',
            {},
            { exitCode: 9, reason: 'launch-failed', type: 'GPU' },
        );

        expect(watched.logged).toEqual([
            ['warn', 'child-process-gone: GPU, reason launch-failed, exit code 9'],
        ]);
        expect(watched.raised).toEqual([]);
        expect(watched.reload).not.toHaveBeenCalled();
    });
});

describe('disposing the watch', () => {
    it('leaves no listener on the window nor on the app', () => {
        watched.stop();

        for (const event of ['render-process-gone', 'unresponsive', 'responsive']) {
            expect(watched.contents.listenerCount(event)).toBe(0);
        }

        expect(watched.app.listenerCount('child-process-gone')).toBe(0);
    });
});
