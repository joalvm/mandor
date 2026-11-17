import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSettledValue } from '../../src/hooks/useSettledValue.js';

afterEach(() => {
    vi.useRealTimers();
});

type Props = { owner: string; value: string };

function settledOf(initialProps: Props) {
    return renderHook(({ owner, value }: Props) => useSettledValue(value, owner), {
        initialProps,
    });
}

/** What is read off a text being typed waits for the typing to pause, as the editor's marks do. */
describe('a value read once it stops changing', () => {
    it('is the first value at once', () => {
        const { result } = settledOf({ owner: 'a', value: 'one' });

        expect(result.current).toBe('one');
    });

    it('keeps the value it had while the next ones keep coming, and takes the last after a pause', () => {
        vi.useFakeTimers();

        const { rerender, result } = settledOf({ owner: 'a', value: 'o' });

        rerender({ owner: 'a', value: 'on' });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        rerender({ owner: 'a', value: 'one' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current).toBe('o');

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(result.current).toBe('one');
    });

    /** Another document is not the same text typed on: what was read of the last one is not its. */
    it('is the value of another owner at once, and waits again from there', () => {
        vi.useFakeTimers();

        const { rerender, result } = settledOf({ owner: 'a', value: 'one' });

        rerender({ owner: 'b', value: 'two' });

        expect(result.current).toBe('two');

        rerender({ owner: 'b', value: 'twos' });

        expect(result.current).toBe('two');

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe('twos');
    });
});
