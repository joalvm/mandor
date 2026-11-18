import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDelayedFlag } from '../../src/hooks/useDelayedFlag.js';

afterEach(() => {
    vi.useRealTimers();
});

describe('a delayed flag', () => {
    it('rises only once the signal outlived the delay, and drops with it', () => {
        vi.useFakeTimers();

        const { rerender, result } = renderHook(({ active }) => useDelayedFlag(active, 400), {
            initialProps: { active: true },
        });

        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current).toBe(true);

        rerender({ active: false });

        expect(result.current).toBe(false);
    });

    it('makes the next signal wait its own delay', () => {
        vi.useFakeTimers();

        const { rerender, result } = renderHook(({ active }) => useDelayedFlag(active, 400), {
            initialProps: { active: true },
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });
        rerender({ active: false });
        rerender({ active: true });

        expect(result.current).toBe(false);
    });
});
