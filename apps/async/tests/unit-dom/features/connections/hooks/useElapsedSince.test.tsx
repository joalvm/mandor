import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useElapsedSince } from '../../../../../src/renderer/features/connections/hooks/useElapsedSince.js';

const START = Date.parse('2026-08-24T10:00:00.000Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('the time since a moment', () => {
    it('grows a second at a time', () => {
        const { result } = renderHook(() => useElapsedSince(START));

        expect(result.current).toBe(0);

        act(() => {
            vi.advanceTimersByTime(42_000);
        });

        expect(result.current).toBe(42_000);
    });

    /** A connection that is not open runs no clock at all. */
    it('counts nothing and runs no clock without a moment', () => {
        const { result } = renderHook(() => useElapsedSince(undefined));

        expect(result.current).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('stops its clock once it is gone', () => {
        const { unmount } = renderHook(() => useElapsedSince(START));

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
