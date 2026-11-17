import { describe, expect, it } from 'vitest';

import { focusWindow, type FocusTarget } from '../../src/window/focus-window.js';

function spyTarget(state: { destroyed?: boolean; minimized?: boolean }) {
    const calls: string[] = [];
    const target: FocusTarget = {
        focus: () => calls.push('focus'),
        isDestroyed: () => state.destroyed ?? false,
        isMinimized: () => state.minimized ?? false,
        restore: () => calls.push('restore'),
    };

    return { calls, target };
}

describe('focusWindow', () => {
    it('restores a minimized window before it takes the focus', () => {
        const { calls, target } = spyTarget({ minimized: true });

        focusWindow(target);

        expect(calls).toEqual(['restore', 'focus']);
    });

    it('only focuses a window that is already showing', () => {
        const { calls, target } = spyTarget({});

        focusWindow(target);

        expect(calls).toEqual(['focus']);
    });

    it('leaves a destroyed window alone', () => {
        const { calls, target } = spyTarget({ destroyed: true });

        focusWindow(target);

        expect(calls).toEqual([]);
    });
});
