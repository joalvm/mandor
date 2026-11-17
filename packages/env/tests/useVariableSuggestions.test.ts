import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { KeyboardEvent } from 'react';

import { createEnvironment } from '@mandor/schema';

import { useVariableSuggestions } from '../src/hooks/useVariableSuggestions.js';
import { windowScope } from '../src/lib/window-scope.js';

const ENVIRONMENT = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
        { name: 'deviceType', value: '2', enabled: true, secret: false },
        { name: 'device_key', value: 'x', enabled: true, secret: false },
    ],
});

/** jsdom has no keyboard events here; the hook reads nothing but the key. */
function key(keyName: string): KeyboardEvent<HTMLElement> {
    return {
        key: keyName,
        preventDefault: () => undefined,
    } as unknown as KeyboardEvent<HTMLElement>;
}

/** The caret the last edit left, at the end of what it wrote. */
function suggestions(value: string, complete = vi.fn()) {
    return renderHook(
        ({ text }: { text: string }) =>
            useVariableSuggestions({
                caret: text.length,
                complete,
                scope: windowScope(ENVIRONMENT, [], []),
                value: text,
            }),
        { initialProps: { text: value } },
    );
}

describe('the name being written', () => {
    /** A caret that only landed somewhere wrote nothing, so it asks for no name. */
    it('is closed while nothing is being written, whatever braces the text holds', () => {
        const { result } = renderHook(() =>
            useVariableSuggestions({
                caret: null,
                complete: vi.fn(),
                scope: windowScope(ENVIRONMENT, [], []),
                value: 'wss://{{',
            }),
        );

        expect(result.current.open).toBe(false);
    });

    it('is open while the braces are, and the options follow the declaration order', () => {
        const { result } = suggestions('wss://{{');

        expect(result.current.open).toBe(true);
        expect(result.current.active).toBe('baseUrl');
        expect(result.current.options.map((option) => option.name)).toEqual([
            'baseUrl',
            'deviceType',
            'device_key',
        ]);
        expect(result.current.options[0]?.hint).toBe('http://localhost:81/');
    });

    it('is closed once the token closes', () => {
        const { result, rerender } = suggestions('wss://{{baseUrl}}');

        rerender({ text: 'wss://{{baseUrl}}' });

        expect(result.current.open).toBe(false);
    });

    it('moves the active name with the arrows, wrapping at the ends', () => {
        const { result } = suggestions('wss://{{');

        act(() => {
            result.current.onKeyDown(key('ArrowDown'));
        });
        expect(result.current.active).toBe('deviceType');

        act(() => {
            result.current.onKeyDown(key('ArrowUp'));
        });
        expect(result.current.active).toBe('baseUrl');

        act(() => {
            result.current.onKeyDown(key('ArrowUp'));
        });
        expect(result.current.active).toBe('device_key');
    });

    it('settles the active name on Enter and closes the list', () => {
        const complete = vi.fn();
        const { result } = suggestions('wss://{{de', complete);

        act(() => {
            result.current.onKeyDown(key('Enter'));
        });

        expect(complete).toHaveBeenCalledWith('deviceType');
        expect(result.current.open).toBe(false);
    });

    it('lets Escape dismiss the list until the query changes', () => {
        const { result, rerender } = suggestions('wss://{{de');

        act(() => {
            result.current.onKeyDown(key('Escape'));
        });
        expect(result.current.open).toBe(false);

        rerender({ text: 'wss://{{dev' });
        expect(result.current.open).toBe(true);
    });

    /** Writing stopped in between: the same name written again is a new question. */
    it('asks again for a name it dismissed once the writing stopped and started over', () => {
        const { result, rerender } = renderHook<
            ReturnType<typeof useVariableSuggestions>,
            { caret: number | null }
        >(
            ({ caret }) =>
                useVariableSuggestions({
                    caret,
                    complete: vi.fn(),
                    scope: windowScope(ENVIRONMENT, [], []),
                    value: 'wss://{{de',
                }),
            { initialProps: { caret: 10 } },
        );

        act(() => {
            result.current.onKeyDown(key('Escape'));
        });
        rerender({ caret: null });
        rerender({ caret: 10 });

        expect(result.current.open).toBe(true);
    });

    it('hands the picked name over and closes', () => {
        const complete = vi.fn();
        const { result } = suggestions('wss://{{', complete);

        act(() => {
            result.current.pick('baseUrl');
        });

        expect(complete).toHaveBeenCalledWith('baseUrl');
        expect(result.current.open).toBe(false);
    });

    describe('the names of the workspace', () => {
        it('join the ones of the environment, without repeating, the environment first', () => {
            const { result } = renderHook(() =>
                useVariableSuggestions({
                    caret: 2,
                    complete: vi.fn(),
                    scope: windowScope(
                        ENVIRONMENT,
                        [
                            { name: 'region', value: 'eu', enabled: true, secret: false },
                            { name: 'baseUrl', value: 'again', enabled: true, secret: false },
                            { name: 'off', value: 'x', enabled: false, secret: false },
                        ],
                        [],
                    ),
                    value: '{{',
                }),
            );
            const names = result.current.options.map((option) => option.name);

            expect(names.filter((name) => name === 'baseUrl')).toHaveLength(1);
            expect(names.at(-1)).toBe('region');
            expect(names).not.toContain('off');
        });
    });
});
