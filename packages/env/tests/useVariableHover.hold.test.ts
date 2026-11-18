import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useVariableHover, type VariableHover } from '../src/hooks/useVariableHover.js';
import { event, token } from './support/hover-token.js';

afterEach(() => {
    document.body.replaceChildren();
});

/** The hook with a panel up for `host`, the way a pointer resting on its token brings it. */
function panelUp(): RenderHookResult<VariableHover, unknown> {
    vi.useFakeTimers();

    const mounted = renderHook(() => useVariableHover());

    act(() => {
        mounted.result.current.onPointerOver(event(token('host')));
    });
    act(() => {
        vi.advanceTimersByTime(400);
    });

    return mounted;
}

describe('the panel a variable token opened, while it holds the focus', () => {
    /** A reader typing into the panel keeps it, wherever the pointer wandered off to. */
    it('does not start closing, and goes on once it lets go', () => {
        const { result } = panelUp();

        act(() => {
            result.current.hold(true);
        });
        act(() => {
            result.current.schedule();
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token?.name).toBe('host');

        act(() => {
            result.current.hold(false);
        });
        act(() => {
            result.current.schedule();
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token).toBeNull();
        vi.useRealTimers();
    });

    it('is not taken by another token the pointer reads on to', () => {
        const { result } = panelUp();

        act(() => {
            result.current.hold(true);
        });
        act(() => {
            result.current.onPointerOver(event(token('port')));
        });

        expect(result.current.token?.name).toBe('host');
        vi.useRealTimers();
    });

    it('closes at once when the panel says so, and the hold goes with it', () => {
        const { result } = panelUp();

        act(() => {
            result.current.hold(true);
        });
        act(() => {
            result.current.close();
        });

        expect(result.current.token).toBeNull();

        act(() => {
            result.current.onPointerOver(event(token('port')));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        act(() => {
            result.current.schedule();
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token).toBeNull();
        vi.useRealTimers();
    });
});
