import { describe, expect, it } from 'vitest';

import { watchMaximizedEvents } from '../../src/window/maximized-events.js';

type WatchableSpy = {
    calls: [event: string, listener: () => void][];
    fire: (event: 'maximize' | 'unmaximize' | 'enter-full-screen') => void;
    maximized: boolean;
    on: (event: string, listener: () => void) => void;
    isMaximized: () => boolean;
};

function spyWindow(): WatchableSpy {
    const calls: [string, () => void][] = [];
    const spy: WatchableSpy = {
        calls,
        maximized: false,
        fire: (event) => {
            for (const [name, listener] of calls) {
                if (name === event) {
                    listener();
                }
            }
        },
        on: (event, listener) => {
            calls.push([event, listener]);
        },
        isMaximized: () => spy.maximized,
    };

    return spy;
}

describe('watching the maximized state of the window', () => {
    /**
     * Full screen hides the system controls on macOS too, so the icon the renderer draws has
     * to hear about it even though a full-screen window is not "maximized" by name.
     */
    it('announces the window on maximize, unmaximize and entering full screen', () => {
        const window = spyWindow();
        const seen: boolean[] = [];

        watchMaximizedEvents(window, (maximized) => {
            seen.push(maximized);
        });

        window.maximized = true;
        window.fire('maximize');

        window.maximized = false;
        window.fire('unmaximize');
        window.fire('enter-full-screen');

        expect(seen).toEqual([true, false, false]);
    });
});
