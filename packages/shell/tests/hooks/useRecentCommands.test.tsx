import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRecentCommands } from '../../src/hooks/useRecentCommands.js';

describe('what was run last in the palette', () => {
    it('starts with nothing', () => {
        const { result } = renderHook(() => useRecentCommands());

        expect(result.current[0]).toEqual([]);
    });

    it('puts the latest first and lists a command once, where it was run last', () => {
        const { result } = renderHook(() => useRecentCommands());

        act(() => {
            result.current[1]('a');
            result.current[1]('b');
            result.current[1]('a');
        });

        expect(result.current[0]).toEqual(['a', 'b']);
    });

    it('keeps only the last twenty', () => {
        const { result } = renderHook(() => useRecentCommands());

        act(() => {
            for (let index = 0; index < 25; index += 1) {
                result.current[1](`command-${String(index)}`);
            }
        });

        expect(result.current[0]).toHaveLength(20);
        expect(result.current[0][0]).toBe('command-24');
        expect(result.current[0].at(-1)).toBe('command-5');
    });

    it('keeps the same function to remember with between renders', () => {
        const { rerender, result } = renderHook(() => useRecentCommands());
        const first = result.current[1];

        rerender();

        expect(result.current[1]).toBe(first);
    });

    it('forgets everything with the window: nothing is written down', () => {
        const first = renderHook(() => useRecentCommands());

        act(() => {
            first.result.current[1]('a');
        });
        first.unmount();

        expect(renderHook(() => useRecentCommands()).result.current[0]).toEqual([]);
    });
});
