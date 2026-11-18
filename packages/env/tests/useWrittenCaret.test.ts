import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { useWrittenCaret } from '../src/hooks/useWrittenCaret.js';

/** The hook reads nothing of a key but its name. */
function key(name: string): KeyboardEvent<HTMLElement> {
    return { key: name } as unknown as KeyboardEvent<HTMLElement>;
}

/** A press as React hands it over: the element listening, and the one pressed. */
function press(currentTarget: HTMLElement, target: HTMLElement): PointerEvent<HTMLElement> {
    return { currentTarget, target } as unknown as PointerEvent<HTMLElement>;
}

function writtenAt(offset: number) {
    const hook = renderHook(() => useWrittenCaret());

    act(() => {
        hook.result.current.write(offset);
    });

    return hook.result;
}

describe('the caret the writing left', () => {
    it('keeps where an edit left it, for a render and for what reads it outside one', () => {
        const caret = writtenAt(7);

        expect(caret.current.at).toBe(7);
        expect(caret.current.atRef.current).toBe(7);
    });

    it('is forgotten when a key only moves the caret', () => {
        const caret = writtenAt(7);

        act(() => {
            caret.current.onKeyDown(key('ArrowLeft'));
        });

        expect(caret.current.at).toBeNull();
        expect(caret.current.atRef.current).toBeNull();
    });

    /** The arrows up and down and Enter belong to the list the caret keeps open. */
    it('stays through a key that writes or steers a list', () => {
        const caret = writtenAt(7);

        act(() => {
            caret.current.onKeyDown(key('a'));
            caret.current.onKeyDown(key('ArrowDown'));
            caret.current.onKeyDown(key('Enter'));
        });

        expect(caret.current.at).toBe(7);
    });

    it('is forgotten when the field itself is pressed', () => {
        const caret = writtenAt(7);
        const field = document.createElement('div');
        const line = field.appendChild(document.createElement('span'));

        act(() => {
            caret.current.onPointerDown(press(field, line));
        });

        expect(caret.current.at).toBeNull();
    });

    /** Picking a suggestion is a press on a portal: forgetting there would drop the list. */
    it('stays when the press bubbles up from a portal outside the field', () => {
        const caret = writtenAt(7);
        const field = document.createElement('div');
        const portal = document.createElement('div');

        act(() => {
            caret.current.onPointerDown(press(field, portal));
        });

        expect(caret.current.at).toBe(7);
    });

    it('is forgotten on demand', () => {
        const caret = writtenAt(7);

        act(() => {
            caret.current.forget();
        });

        expect(caret.current.at).toBeNull();
    });
});
