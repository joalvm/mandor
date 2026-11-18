import { afterEach, describe, expect, it, vi } from 'vitest';

import { watchWindowTheme, windowTheme } from '../../src/editor/window-theme.js';

type ChangeListener = () => void;

/** A system preference the test can flip, the way the operating system flips it. */
function systemPreference(dark: boolean): { flip: (next: boolean) => void } {
    const listeners = new Set<ChangeListener>();
    const state = { dark };

    vi.stubGlobal('matchMedia', (query: string) => ({
        addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
        matches: query === '(prefers-color-scheme: dark)' && state.dark,
        removeEventListener: (_type: string, listener: ChangeListener) =>
            listeners.delete(listener),
    }));

    return {
        flip: (next) => {
            state.dark = next;
            listeners.forEach((listener) => {
                listener();
            });
        },
    };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
});

describe('the theme the window is in', () => {
    it('takes the theme the window declares over the one the system prefers', () => {
        systemPreference(true);
        document.documentElement.dataset['theme'] = 'light';

        expect(windowTheme()).toBe('light');
    });

    it('takes each of the four themes the window can declare', () => {
        systemPreference(false);

        for (const theme of ['dark', 'dark-contrast', 'light', 'light-contrast'] as const) {
            document.documentElement.dataset['theme'] = theme;

            expect(windowTheme()).toBe(theme);
        }
    });

    it('does not take a theme the window has no name for', () => {
        systemPreference(true);
        document.documentElement.dataset['theme'] = 'sepia';

        expect(windowTheme()).toBe('dark');
    });

    it('follows the system while the window declares none', () => {
        systemPreference(true);

        expect(windowTheme()).toBe('dark');
    });

    it('falls back to light when neither the window nor the system says dark', () => {
        expect(windowTheme()).toBe('light');
    });
});

describe('watching the theme of the window', () => {
    it('tells the new theme each time the window changes it, until told to stop', async () => {
        const onChange = vi.fn();
        const stop = watchWindowTheme(onChange);

        document.documentElement.dataset['theme'] = 'dark';
        await settle();

        expect(onChange).toHaveBeenLastCalledWith('dark');

        stop();
        document.documentElement.dataset['theme'] = 'light';
        await settle();

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('tells the new theme when the system changes its preference', () => {
        const system = systemPreference(false);
        const onChange = vi.fn();
        const stop = watchWindowTheme(onChange);

        system.flip(true);

        expect(onChange).toHaveBeenCalledWith('dark');

        stop();
    });

    /** Repainting every editor for a theme it already wears is work nobody sees. */
    it('stays quiet when a change leaves the theme as it was', async () => {
        const onChange = vi.fn();
        const stop = watchWindowTheme(onChange);

        document.documentElement.dataset['theme'] = 'light';
        await settle();

        expect(onChange).not.toHaveBeenCalled();

        stop();
    });
});
