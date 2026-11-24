import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeySuggestions } from '../src/components/key-value/useKeySuggestions.js';

const NAMES = ['Accept', 'Accept-Encoding', 'User-Agent'];

function keyed(key: string): KeyboardEvent {
    return new KeyboardEvent('keydown', { key });
}

function suggestionsOf(initial: {
    focused?: boolean;
    value?: string;
    names?: readonly string[] | undefined;
}) {
    const complete = vi.fn();
    const { rerender, result } = renderHook(
        (props: { value: string }) =>
            useKeySuggestions({
                complete,
                focused: initial.focused ?? true,
                suggestions: 'names' in initial ? initial.names : NAMES,
                value: props.value,
            }),
        { initialProps: { value: initial.value ?? '' } },
    );

    return { complete, rerender, result };
}

describe('the names a key cell suggests', () => {
    it('hangs no list from a cell nobody is writing in', () => {
        expect(suggestionsOf({ focused: false }).result.current).toBeNull();
    });

    it('hangs no list when the table has no names to give', () => {
        expect(suggestionsOf({ names: undefined }).result.current).toBeNull();
    });

    it('opens with the names that still fit, the first one under the keyboard', () => {
        const { result } = suggestionsOf({ value: 'acc' });

        expect(result.current).toMatchObject({
            active: 'Accept',
            open: true,
            options: ['Accept', 'Accept-Encoding'],
        });
    });

    it('stays closed when nothing fits what is written', () => {
        expect(suggestionsOf({ value: 'zzz' }).result.current?.open).toBe(false);
    });

    it('walks the list with the arrows and wraps at both ends', () => {
        const { result } = suggestionsOf({ value: 'acc' });

        act(() => {
            result.current?.onKeyDown(keyed('ArrowDown'));
        });
        expect(result.current?.active).toBe('Accept-Encoding');

        act(() => {
            result.current?.onKeyDown(keyed('ArrowDown'));
        });
        expect(result.current?.active).toBe('Accept');

        act(() => {
            result.current?.onKeyDown(keyed('ArrowUp'));
        });
        expect(result.current?.active).toBe('Accept-Encoding');
    });

    it('lets the pointer take the keyboard to the option under it', () => {
        const { result } = suggestionsOf({ value: 'acc' });

        act(() => {
            result.current?.setActive('Accept-Encoding');
        });

        expect(result.current?.active).toBe('Accept-Encoding');
    });

    it('settles the active name with Enter and keeps the list away once the cell says it', () => {
        const { complete, rerender, result } = suggestionsOf({ value: 'acc' });

        act(() => {
            expect(result.current?.onKeyDown(keyed('Enter'))).toBe(true);
        });

        expect(complete).toHaveBeenCalledWith('Accept');

        // The cell now holds the name it was given: that query stays sent away.
        rerender({ value: 'Accept' });
        expect(result.current?.open).toBe(false);
    });

    it('keeps a query sent away by Escape away until the query changes', () => {
        const { rerender, result } = suggestionsOf({ value: 'acc' });

        act(() => {
            expect(result.current?.onKeyDown(keyed('Escape'))).toBe(true);
        });
        expect(result.current?.open).toBe(false);

        rerender({ value: 'acc' });
        expect(result.current?.open).toBe(false);

        rerender({ value: 'user' });
        expect(result.current?.open).toBe(true);
    });

    it('answers no key while the list is closed, so the grid walks', () => {
        const { result } = suggestionsOf({ value: 'zzz' });

        expect(result.current?.onKeyDown(keyed('ArrowDown'))).toBe(false);
    });

    it('lets the grid have the keys the list does not use', () => {
        const { result } = suggestionsOf({ value: 'acc' });

        expect(result.current?.onKeyDown(keyed('a'))).toBe(false);
    });
});
