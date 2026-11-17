import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEditorVariableHover } from '../src/hooks/useEditorVariableHover.js';

const TOKEN = { name: 'deviceType', rect: new DOMRect(1, 2, 30, 14) };

afterEach(() => {
    vi.useRealTimers();
});

describe('the hovered variable of an editor document', () => {
    it('holds the token the editor reports', () => {
        const { result } = renderHook(() => useEditorVariableHover());

        act(() => {
            result.current.onHover(TOKEN);
        });

        expect(result.current.token?.name).toBe('deviceType');
    });

    it('waits before closing, so the pointer can reach the popover', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useEditorVariableHover());

        act(() => {
            result.current.onHover(TOKEN);
        });
        act(() => {
            result.current.onHover(null);
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(result.current.token).not.toBeNull();

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current.token).toBeNull();
    });

    /** A reader typing into the popover keeps it, wherever the pointer wandered off to. */
    it('does not start closing while the popover holds the focus, and goes on once it lets go', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useEditorVariableHover());

        act(() => {
            result.current.onHover(TOKEN);
        });
        act(() => {
            result.current.hold(true);
        });
        act(() => {
            result.current.onHover(null);
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token?.name).toBe('deviceType');

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
    });

    it('is not taken by another token while the popover holds the focus', () => {
        const { result } = renderHook(() => useEditorVariableHover());

        act(() => {
            result.current.onHover(TOKEN);
        });
        act(() => {
            result.current.hold(true);
        });
        act(() => {
            result.current.onHover({ name: 'port', rect: new DOMRect(40, 2, 30, 14) });
        });

        expect(result.current.token?.name).toBe('deviceType');
    });

    it('closes at once when the popover is dismissed, and the hold goes with it', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useEditorVariableHover());

        act(() => {
            result.current.onHover(TOKEN);
        });
        act(() => {
            result.current.hold(true);
        });
        act(() => {
            result.current.close();
        });
        act(() => {
            result.current.onHover(TOKEN);
        });
        act(() => {
            result.current.onHover(null);
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token).toBeNull();
    });

    it('closes at once when the popover is dismissed from its own side', () => {
        const { result } = renderHook(() => useEditorVariableHover());

        act(() => {
            result.current.onHover(TOKEN);
        });
        act(() => {
            result.current.close();
        });

        expect(result.current.token).toBeNull();
    });
});
