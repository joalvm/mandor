import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarkedCopy } from '../../src/hooks/useMarkedCopy.js';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'clipboard');
});

describe('a copy marked on the control that made it', () => {
    it('puts the text on the clipboard and is marked for a moment, then no more', async () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useMarkedCopy());

        expect(result.current.copied).toBe(false);

        await act(async () => {
            result.current.copy('orders');
            await Promise.resolve();
        });

        expect(writeText).toHaveBeenCalledWith('orders');
        expect(result.current.copied).toBe(true);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500);
        });

        expect(result.current.copied).toBe(false);
    });

    it('is not marked when the clipboard refuses the text', async () => {
        writeText.mockRejectedValue(new Error('denied'));

        const { result } = renderHook(() => useMarkedCopy());

        await act(async () => {
            result.current.copy('orders');
            await Promise.resolve();
        });

        expect(result.current.copied).toBe(false);
    });
});
