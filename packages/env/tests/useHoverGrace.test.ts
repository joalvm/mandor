import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useHoverGrace } from '../src/hooks/useHoverGrace.js';

const TOKEN = { name: 'baseUrl', rect: new DOMRect(4, 8, 60, 16) };

afterEach(() => {
    vi.useRealTimers();
});

describe('the grace a variable popover lives by', () => {
    it('hangs the popover from the rect of the token it shows', () => {
        const { result } = renderHook(() => useHoverGrace());

        act(() => {
            result.current.controls.show(TOKEN);
        });

        expect(result.current.hover.token).toEqual(TOKEN);
        expect(result.current.controls.showing()).toBe(true);
        expect(result.current.hover.anchor.current.getBoundingClientRect()).toBe(TOKEN.rect);
    });

    it('closes after the wait, and a pointer back on the token cancels it', () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useHoverGrace());

        act(() => {
            result.current.controls.show(TOKEN);
            result.current.hover.schedule();
            result.current.hover.cancel();
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.hover.token).toEqual(TOKEN);

        act(() => {
            result.current.hover.schedule();
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.hover.token).toBeNull();
        expect(result.current.controls.showing()).toBe(false);
    });

    it('starts no close while held, and forgets the hold once closed', () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useHoverGrace());

        act(() => {
            result.current.controls.show(TOKEN);
            result.current.hover.hold(true);
            result.current.hover.schedule();
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.hover.token).toEqual(TOKEN);
        expect(result.current.controls.held()).toBe(true);

        act(() => {
            result.current.hover.close();
        });

        expect(result.current.hover.token).toBeNull();
        expect(result.current.controls.held()).toBe(false);
    });

    it('keeps one timer: a later wait takes the place of the one before', () => {
        vi.useFakeTimers();

        const first = vi.fn();
        const second = vi.fn();
        const { result } = renderHook(() => useHoverGrace());

        act(() => {
            result.current.controls.after(100, first);
            result.current.controls.after(100, second);
            vi.advanceTimersByTime(100);
        });

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });
});
