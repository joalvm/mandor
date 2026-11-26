import { useMessages } from '@mandor/i18n';
import { Markdown, setTextZoom } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { windowBridge } from '@mandor/ipc/testing';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferencesApplication } from '../src/preferences-application.js';
import { PreferencesProvider } from '../src/preferences-context.js';

function PreferenceMessage() {
    const message = useMessages('preferences');

    return <span>{message('language')}</span>;
}

/** Says what it finds on the window the first time its own effects run. */
function WindowReader({ onSeen }: { onSeen: (lang: string, theme: string | undefined) => void }) {
    useEffect(() => {
        onSeen(document.documentElement.lang, document.documentElement.dataset['theme']);
    }, [onSeen]);

    return null;
}

/** Spanish, and the dark theme held whatever the system looks like. */
const HELD_DARK = JSON.stringify({
    'appearance.language': 'es',
    'appearance.themeManual': 'dark',
    'appearance.themeMode': 'manual',
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    setTextZoom(0);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.removeAttribute('data-motion');
    document.documentElement.removeAttribute('lang');
    window.localStorage.clear();
    vi.restoreAllMocks();
});

describe('preferences application', () => {
    it('applies the saved language and theme', async () => {
        window.localStorage.setItem('mandor.preferences', HELD_DARK);

        render(
            <PreferencesProvider>
                <PreferencesApplication>
                    <PreferenceMessage />
                </PreferencesApplication>
            </PreferencesProvider>,
        );

        expect(screen.getByText('Idioma')).toBeVisible();
        await waitFor(() => {
            expect(document.documentElement.dataset['theme']).toBe('dark');
        });
    });

    it('names the density on the window and takes it away when it closes', () => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'appearance.density': 'compact' }),
        );

        const { unmount } = render(
            <PreferencesProvider>
                <PreferencesApplication />
            </PreferencesProvider>,
        );

        expect(document.documentElement.dataset['density']).toBe('compact');

        unmount();

        expect(document.documentElement.dataset['density']).toBeUndefined();
    });

    /**
     * A choice of motion is named on the window for the stylesheets; following the system names
     * nothing, so they keep reading what the system asks for.
     */
    it.each([
        ['full', 'full'],
        ['reduced', 'reduced'],
        ['system', undefined],
    ])('names the motion %s on the window as %s', (motion, named) => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'appearance.motion': motion }),
        );

        const { unmount } = render(
            <PreferencesProvider>
                <PreferencesApplication />
            </PreferencesProvider>,
        );

        expect(document.documentElement.dataset['motion']).toBe(named);

        unmount();

        expect(document.documentElement.dataset['motion']).toBeUndefined();
    });

    /**
     * The window says what language it was drawn in: a screen reader pronounces it by that, and
     * the editor loads the messages it was built with by reading it.
     */
    it('says on the window which language it is being read in', async () => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'appearance.language': 'es' }),
        );

        render(
            <PreferencesProvider>
                <PreferencesApplication>
                    <PreferenceMessage />
                </PreferencesApplication>
            </PreferencesProvider>,
        );

        await waitFor(() => {
            expect(document.documentElement.lang).toBe('es');
        });
    });

    /**
     * The effects of what the window holds run before the ones of the window itself, and the
     * editor reads the language as it loads: both are on the window before anyone looks, and the
     * theme before the first paint.
     */
    it('sets the language and the theme before anything inside the window reads them', () => {
        const onSeen = vi.fn();

        window.localStorage.setItem('mandor.preferences', HELD_DARK);

        render(
            <PreferencesProvider>
                <PreferencesApplication>
                    <WindowReader onSeen={onSeen} />
                </PreferencesApplication>
            </PreferencesProvider>,
        );

        expect(onSeen).toHaveBeenCalledExactlyOnceWith('es', 'dark');
    });

    it('tells main what the person chose about the updates, when it mounts and at each change', async () => {
        const configure = vi.spyOn(windowBridge().update, 'configure').mockResolvedValue({
            ok: true,
            value: {},
        });
        const view = () => (
            <PreferencesProvider>
                <PreferencesApplication>
                    <PreferenceMessage />
                </PreferencesApplication>
            </PreferencesProvider>
        );

        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'updates.mode': 'notify', 'updates.channel': 'beta' }),
        );

        const mounted = render(view());

        await waitFor(() => {
            expect(configure).toHaveBeenCalledWith({ mode: 'notify', channel: 'beta' });
        });
        mounted.rerender(view());

        expect(configure).toHaveBeenCalledOnce();
    });

    it('tells main to follow the betas on a beta the person never chose a channel for', async () => {
        vi.spyOn(windowBridge().update, 'state').mockResolvedValue({
            ok: true,
            value: { phase: 'idle', support: 'full', current: '0.1.0-beta.1' },
        });
        const configure = vi.spyOn(windowBridge().update, 'configure').mockResolvedValue({
            ok: true,
            value: {},
        });

        render(
            <PreferencesProvider>
                <PreferencesApplication>
                    <PreferenceMessage />
                </PreferencesApplication>
            </PreferencesProvider>,
        );

        await waitFor(() => {
            expect(configure).toHaveBeenLastCalledWith({ mode: 'auto', channel: 'beta' });
        });
    });

    it('names the theme of the system on the window too, so the stylesheets never guess', () => {
        render(
            <PreferencesProvider>
                <PreferencesApplication>
                    <PreferenceMessage />
                </PreferencesApplication>
            </PreferencesProvider>,
        );

        expect(document.documentElement.dataset['theme']).toBe('light');
    });

    /**
     * Main follows the system unless a theme is held, and the window reads the system's appearance
     * from main: asking it for a scheme while the system picks would make that reading a lie.
     */
    it('asks main to follow the system while the system picks, and the scheme of the held theme otherwise', async () => {
        const configure = vi.spyOn(windowBridge().app, 'configureAppearance').mockResolvedValue({
            ok: true,
            value: {},
        });
        const view = () => (
            <PreferencesProvider>
                <PreferencesApplication>
                    <PreferenceMessage />
                </PreferencesApplication>
            </PreferencesProvider>
        );

        const system = render(view());

        await waitFor(() => {
            expect(configure).toHaveBeenCalledExactlyOnceWith({ source: 'system' });
        });
        system.unmount();
        window.localStorage.setItem('mandor.preferences', HELD_DARK);
        render(view());

        await waitFor(() => {
            expect(configure).toHaveBeenLastCalledWith({ source: 'dark' });
        });
    });

    /** The reader enlarged the text to read it, and opens the window to read it again. */
    it('opens the window at the size the reader left its text at, and keeps every new one', () => {
        window.localStorage.setItem('mandor.textZoom', '3');

        const { container } = render(
            <PreferencesProvider>
                <PreferencesApplication>
                    <Markdown value="Texto" />
                </PreferencesApplication>
            </PreferencesProvider>,
        );

        expect(byPart('markdown', container)).toHaveAttribute('data-text-zoom', '3');

        act(() => {
            setTextZoom(5);
        });

        expect(window.localStorage.getItem('mandor.textZoom')).toBe('5');
    });
});
