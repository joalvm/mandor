import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useHoverGrace } from '../src/hooks/useHoverGrace.js';

/** What a surface that keeps its presses to itself does with one. */
function swallow(event: Event): void {
    event.stopPropagation();
}

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

    it('shows one popover in the window: opening another closes the one before', () => {
        const first = renderHook(() => useHoverGrace());
        const second = renderHook(() => useHoverGrace());

        act(() => {
            first.result.current.controls.show(TOKEN);
        });
        act(() => {
            second.result.current.controls.show({ ...TOKEN, name: 'token' });
        });

        expect(first.result.current.hover.token).toBeNull();
        expect(second.result.current.hover.token?.name).toBe('token');

        act(() => {
            first.result.current.controls.show(TOKEN);
        });

        expect(second.result.current.hover.token).toBeNull();
    });

    it('closes on a press outside it, and a press inside its panel keeps it', () => {
        const panel = document.createElement('div');
        const inside = document.createElement('button');

        panel.dataset['part'] = 'variable-popover';
        panel.append(inside);
        document.body.append(panel);

        const { result } = renderHook(() => useHoverGrace());

        act(() => {
            result.current.controls.show(TOKEN);
        });
        act(() => {
            inside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        });

        expect(result.current.hover.token).toEqual(TOKEN);

        act(() => {
            // A press the surface under it swallows still closes it: it is heard on the way down.
            document.body.addEventListener('pointerdown', swallow);
            document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
            document.body.removeEventListener('pointerdown', swallow);
        });

        expect(result.current.hover.token).toBeNull();
        panel.remove();
    });

    it('closes when the window loses the focus, even while held', () => {
        const { result } = renderHook(() => useHoverGrace());

        act(() => {
            result.current.controls.show(TOKEN);
            result.current.hover.hold(true);
        });
        act(() => {
            window.dispatchEvent(new Event('blur'));
        });

        expect(result.current.hover.token).toBeNull();
        expect(result.current.controls.held()).toBe(false);
    });
});
