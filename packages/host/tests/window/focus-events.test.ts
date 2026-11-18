import { describe, expect, it, vi } from 'vitest';

import { watchFocusEvents } from '../../src/window/focus-events.js';

describe('watching the focus of the window', () => {
    it('announces each time the window takes the focus, and only then', () => {
        const listeners = new Map<string, () => void>();
        const notify = vi.fn();

        watchFocusEvents({ on: (event, listener) => listeners.set(event, listener) }, notify);

        expect([...listeners.keys()]).toEqual(['focus']);

        listeners.get('focus')?.();
        listeners.get('focus')?.();

        expect(notify).toHaveBeenCalledTimes(2);
    });
});
