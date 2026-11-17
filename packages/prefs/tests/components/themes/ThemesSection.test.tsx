import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemesSection } from '../../../src/components/themes/ThemesSection.js';
import { PreferencesProvider } from '../../../src/preferences-context.js';
import { PREFERENCE_STORAGE_KEY } from '../../../src/preferences-storage.js';
import { systemPrefering } from '../../theme/system-appearance.js';

function renderSection() {
    return render(
        <MessagesProvider preferences={{}}>
            <PreferencesProvider>
                <TooltipProvider>
                    <ThemesSection />
                </TooltipProvider>
            </PreferencesProvider>
        </MessagesProvider>,
    );
}

function stored(): unknown {
    return JSON.parse(window.localStorage.getItem(PREFERENCE_STORAGE_KEY) ?? '{}');
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe('the themes of the window', () => {
    it('follows the system by default, with a card for the day and another for the night', () => {
        renderSection();

        expect(screen.getByRole('combobox', { name: 'Appearance' })).toHaveTextContent(
            'Follow the system',
        );
        expect(screen.getByRole('combobox', { name: 'Day theme' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Night theme' })).toBeVisible();
        expect(screen.queryByRole('combobox', { name: 'Theme' })).toBeNull();
    });

    it('holds one theme when the reader chooses to, and then shows a single card', () => {
        renderSection();
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Appearance' }), {
            key: 'ArrowDown',
        });
        fireEvent.click(screen.getByRole('option', { name: 'Hold one theme' }));

        expect(stored()).toEqual({ 'appearance.themeMode': 'manual' });
        expect(screen.getByRole('combobox', { name: 'Theme' })).toBeVisible();
        expect(screen.queryByRole('combobox', { name: 'Day theme' })).toBeNull();
        expect(screen.queryByRole('combobox', { name: 'Night theme' })).toBeNull();
    });

    it('offers the night card the dark themes and writes the one chosen', async () => {
        renderSection();
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Night theme' }), {
            key: 'ArrowDown',
        });

        expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
            'Dark',
            'Dark, high contrast',
        ]);

        fireEvent.click(screen.getByRole('option', { name: 'Dark, high contrast' }));

        expect(stored()).toEqual({ 'appearance.themeNight': 'dark-contrast' });
    });

    it('offers the card of a held theme all four and writes the one chosen', async () => {
        window.localStorage.setItem(
            PREFERENCE_STORAGE_KEY,
            JSON.stringify({ 'appearance.themeMode': 'manual' }),
        );
        renderSection();
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Theme' }), { key: 'ArrowDown' });

        expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
            'Light',
            'Light, high contrast',
            'Dark',
            'Dark, high contrast',
        ]);

        fireEvent.click(screen.getByRole('option', { name: 'Light, high contrast' }));

        expect(stored()).toMatchObject({ 'appearance.themeManual': 'light-contrast' });
    });

    it('marks as active the card of the appearance the system has now', () => {
        const { setDark } = systemPrefering(false);

        renderSection();

        const day = screen.getByRole('group', { name: 'Day theme' });
        const night = screen.getByRole('group', { name: 'Night theme' });

        expect(within(day).getByText('Active')).toBeVisible();
        expect(within(night).queryByText('Active')).toBeNull();

        act(() => {
            setDark(true);
        });

        expect(within(day).queryByText('Active')).toBeNull();
        expect(within(night).getByText('Active')).toBeVisible();
    });

    it('marks the card of a held theme as active whatever the system looks like', () => {
        systemPrefering(true);
        window.localStorage.setItem(
            PREFERENCE_STORAGE_KEY,
            JSON.stringify({ 'appearance.themeManual': 'light', 'appearance.themeMode': 'manual' }),
        );
        renderSection();

        expect(
            within(screen.getByRole('group', { name: 'Theme' })).getByText('Active'),
        ).toBeVisible();
    });

    it('says that a theme only changes colour and contrast', () => {
        renderSection();

        expect(screen.getByText(/never moves anything/)).toBeVisible();
    });
});
