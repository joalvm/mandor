import type { KeyValueLine } from '@mandor/env';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useExpectedLines } from '../../../../../src/renderer/features/requests/hooks/useExpectedLines.js';
import type { ExpectedPair } from '../../../../../src/renderer/features/requests/lib/expected-lines.js';

const ACCEPT: ExpectedPair = ['accept', 'text/plain'];

function line(name: string, value = ''): KeyValueLine {
    return { disabled: false, id: name, name, value };
}

afterEach(() => {
    cleanup();
});

describe('the lines of what an example declares (useExpectedLines)', () => {
    it('starts from the pairs of the example', () => {
        const { result } = renderHook(() => useExpectedLines([ACCEPT], vi.fn()));

        expect(result.current.lines.map(({ name, value }) => [name, value])).toEqual([ACCEPT]);
    });

    it('writes the example from a line with a name', () => {
        const onWrite = vi.fn();
        const { result } = renderHook(() => useExpectedLines([], onWrite));

        act(() => {
            result.current.onLinesChange([line('accept', 'text/plain')]);
        });

        expect(onWrite).toHaveBeenCalledWith([ACCEPT]);
    });

    /** While a line is being typed it has no name yet: it stays on the table, out of the example. */
    it('keeps on the table a line with no name, and writes nothing for it', () => {
        const onWrite = vi.fn();
        const { result } = renderHook(() => useExpectedLines([], onWrite));

        act(() => {
            result.current.onLinesChange([line('', 'text/plain')]);
        });

        expect(result.current.lines).toHaveLength(1);
        expect(onWrite).not.toHaveBeenCalled();
    });

    it('follows the example when another hand moves it', () => {
        const { rerender, result } = renderHook(({ pairs }) => useExpectedLines(pairs, vi.fn()), {
            initialProps: { pairs: [ACCEPT] },
        });

        rerender({ pairs: [['age', '60']] });

        expect(result.current.lines.map(({ name }) => name)).toEqual(['age']);
    });
});
