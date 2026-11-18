import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useVariableHover } from '../src/hooks/useVariableHover.js';
import { event, token } from './support/hover-token.js';

afterEach(() => {
    document.body.replaceChildren();
});

describe('the variable token under the pointer', () => {
    it('names the painted token the pointer rested on', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useVariableHover());
        const element = token('host');

        act(() => {
            result.current.onPointerOver(event(element));
        });

        expect(result.current.token).toBeNull();

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token?.name).toBe('host');
        vi.useRealTimers();
    });

    /**
     * A panel that arrives the instant the pointer touches a token arrives while the pointer
     * is on its way somewhere else, over whatever the reader was about to click.
     */
    it('opens nothing for a pointer that is only passing over', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useVariableHover());
        const element = token('host');

        act(() => {
            result.current.onPointerOver(event(element));
        });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current.token).toBeNull();

        act(() => {
            result.current.onPointerOut(event(element));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token).toBeNull();
        vi.useRealTimers();
    });

    /** With one panel already up, the wait is spent: reading along a line is one gesture. */
    it('moves to the next token at once while a panel is already up', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useVariableHover());
        const first = token('host');
        const second = token('port');

        act(() => {
            result.current.onPointerOver(event(first));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        act(() => {
            result.current.onPointerOver(event(second));
        });

        expect(result.current.token?.name).toBe('port');
        vi.useRealTimers();
    });

    it('starts closing when the pointer leaves, and stays while a panel holds it', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useVariableHover());
        const element = token('host');

        act(() => {
            result.current.onPointerOver(event(element));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        act(() => {
            result.current.onPointerOut(event(element));
        });
        act(() => {
            result.current.cancel();
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token?.name).toBe('host');
        vi.useRealTimers();
    });

    it('lets the token go once the grace is spent', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useVariableHover());
        const element = token('host');

        act(() => {
            result.current.onPointerOver(event(element));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        act(() => {
            result.current.onPointerOut(event(element));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.token).toBeNull();
        vi.useRealTimers();
    });

    it('closes at once when the panel says so', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useVariableHover());
        const element = token('host');

        act(() => {
            result.current.onPointerOver(event(element));
        });
        act(() => {
            vi.advanceTimersByTime(400);
        });
        act(() => {
            result.current.close();
        });

        expect(result.current.token).toBeNull();
        vi.useRealTimers();
    });

    it('ignores a pointer over plain text', () => {
        const { result } = renderHook(() => useVariableHover());
        const plain = document.createElement('span');

        plain.textContent = 'wss://';
        document.body.append(plain);

        act(() => {
            result.current.onPointerOver(event(plain));
        });

        expect(result.current.token).toBeNull();
    });
});
