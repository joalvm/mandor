import { describe, expect, it, vi } from 'vitest';

import {
    opensDevTools,
    watchDevToolsShortcut,
    type DevToolsSource,
    type ShortcutInput,
} from '../../src/devtools/watch-devtools-shortcut.js';

function input(keys: Partial<ShortcutInput>): ShortcutInput {
    return {
        type: 'keyDown',
        key: '',
        control: false,
        meta: false,
        alt: false,
        shift: false,
        ...keys,
    };
}

describe('the devtools shortcut predicate', () => {
    it('answers F12 on every platform', () => {
        expect(opensDevTools(input({ key: 'F12' }), 'win32')).toBe(true);
        expect(opensDevTools(input({ key: 'F12' }), 'darwin')).toBe(true);
        expect(opensDevTools(input({ key: 'F12' }), 'linux')).toBe(true);
    });

    it('answers the chord of each platform on i', () => {
        expect(opensDevTools(input({ key: 'i', control: true, shift: true }), 'win32')).toBe(true);
        expect(opensDevTools(input({ key: 'i', meta: true, alt: true }), 'darwin')).toBe(true);
        expect(opensDevTools(input({ key: 'i', control: true, shift: true }), 'linux')).toBe(true);
    });

    it('refuses the chords of another platform', () => {
        expect(opensDevTools(input({ key: 'i', control: true, shift: true }), 'darwin')).toBe(
            false,
        );
        expect(opensDevTools(input({ key: 'i', meta: true, alt: true }), 'win32')).toBe(false);
    });

    it('refuses a lonely i', () => {
        expect(opensDevTools(input({ key: 'i', control: true }), 'win32')).toBe(false);
        expect(opensDevTools(input({ key: 'i', shift: true }), 'win32')).toBe(false);
        expect(opensDevTools(input({ key: 'i', alt: true }), 'darwin')).toBe(false);
        expect(opensDevTools(input({ key: 'i' }), 'win32')).toBe(false);
    });
});

describe('watching the devtools shortcut', () => {
    type Listener = (event: { preventDefault: () => void }, input: ShortcutInput) => void;

    function spySource() {
        const listeners: Listener[] = [];
        const source: DevToolsSource = {
            on: vi.fn((_event: string, listener: Listener) => {
                listeners.push(listener);
            }),
            off: vi.fn((_event: string, listener: Listener) => {
                const found = listeners.indexOf(listener);

                if (found !== -1) {
                    listeners.splice(found, 1);
                }
            }),
            toggleDevTools: vi.fn(),
        };

        return { listeners, source };
    }

    function fire(listeners: Listener[], given: Partial<ShortcutInput>): void {
        for (const listener of listeners) {
            listener({ preventDefault: () => undefined }, input(given));
        }
    }

    it('opens devtools on the press of F12 and eats the event', () => {
        const { listeners, source } = spySource();

        watchDevToolsShortcut(source, 'win32');

        fire(listeners, { key: 'F12' });

        expect(source.toggleDevTools).toHaveBeenCalledOnce();
    });

    it('ignores the release, so the key toggles once per press', () => {
        const { listeners, source } = spySource();

        watchDevToolsShortcut(source, 'win32');

        fire(listeners, { key: 'F12', type: 'keyUp' });

        expect(source.toggleDevTools).not.toHaveBeenCalled();
    });

    it('stops watching when disposed', () => {
        const { listeners, source } = spySource();
        const stop = watchDevToolsShortcut(source, 'win32');

        stop();

        expect(listeners).toEqual([]);
    });
});
