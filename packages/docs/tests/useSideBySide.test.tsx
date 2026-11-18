import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSideBySide } from '../src/hooks/useSideBySide.js';

type Heard = (entries: { contentRect: { width: number } }[]) => void;

const observers: { disconnected: boolean; heard: Heard; observed: Element[] }[] = [];

/** A box the test resizes by hand: jsdom lays nothing out, so nothing would ever be measured. */
class HandResizedObserver {
    private readonly entry: (typeof observers)[number];

    constructor(heard: Heard) {
        this.entry = { disconnected: false, heard, observed: [] };
        observers.push(this.entry);
    }

    observe(element: Element): void {
        this.entry.observed.push(element);
    }

    disconnect(): void {
        this.entry.disconnected = true;
    }
}

function resize(width: number): void {
    act(() => {
        observers.at(-1)?.heard([{ contentRect: { width } }]);
    });
}

beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('ResizeObserver', HandResizedObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('whether the markdown and its page fit side by side', () => {
    /** The first frame is not the moment to flip the panel: until measured, the box is wide. */
    it('counts the box as wide until it has been measured', () => {
        const box = { current: document.createElement('div') };
        const { result } = renderHook(() => useSideBySide(box));

        expect(result.current).toBe(true);
        expect(observers[0]?.observed).toEqual([box.current]);
    });

    it('follows the box as it is dragged narrower and wider', () => {
        const box = { current: document.createElement('div') };
        const { result } = renderHook(() => useSideBySide(box));

        resize(639);

        expect(result.current).toBe(false);

        resize(640);

        expect(result.current).toBe(true);
    });

    it('stops measuring once the box is gone', () => {
        const box = { current: document.createElement('div') };
        const { unmount } = renderHook(() => useSideBySide(box));

        unmount();

        expect(observers[0]?.disconnected).toBe(true);
    });

    it('measures nothing while there is no box', () => {
        const { result } = renderHook(() => useSideBySide({ current: null }));

        expect(result.current).toBe(true);
        expect(observers).toHaveLength(0);
    });
});
