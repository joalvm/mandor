import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeCard, type ThemeSlot } from '../../../src/components/themes/ThemeCard.js';
import { PreferencesProvider } from '../../../src/preferences-context.js';
import { PREFERENCE_STORAGE_KEY } from '../../../src/preferences-storage.js';
import { systemPrefering } from '../../theme/system-appearance.js';

function renderCard(slot: ThemeSlot) {
    return render(
        <MessagesProvider preferences={{}}>
            <PreferencesProvider>
                <TooltipProvider>
                    <ThemeCard slot={slot} />
                </TooltipProvider>
            </PreferencesProvider>
        </MessagesProvider>,
    );
}

function stored(): unknown {
    return JSON.parse(window.localStorage.getItem(PREFERENCE_STORAGE_KEY) ?? '{}');
}

afterEach(() => {
    cleanup();

    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe('ThemeCard', () => {
    it('is a group named after the place it chooses a theme for', () => {
        renderCard('night');

        expect(screen.getByRole('group', { name: 'Night theme' })).toBeVisible();
    });

    it('offers the day the light themes only and writes the one chosen', async () => {
        renderCard('day');
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Day theme' }), {
            key: 'ArrowDown',
        });

        expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
            'Light',
            'Light, high contrast',
        ]);

        fireEvent.click(screen.getByRole('option', { name: 'Light, high contrast' }));

        expect(stored()).toEqual({ 'appearance.themeDay': 'light-contrast' });
    });

    it('draws the miniature of the theme it holds', () => {
        window.localStorage.setItem(
            PREFERENCE_STORAGE_KEY,
            JSON.stringify({ 'appearance.themeNight': 'dark-contrast' }),
        );
        renderCard('night');

        expect(byPart('theme-preview').dataset['theme']).toBe('dark-contrast');
    });

    it('wears the active badge only while its theme is the one the window is drawn in', () => {
        systemPrefering(false);
        renderCard('night');

        expect(
            within(screen.getByRole('group', { name: 'Night theme' })).queryByText('Active'),
        ).toBeNull();

        cleanup();
        renderCard('day');

        expect(
            within(screen.getByRole('group', { name: 'Day theme' })).getByText('Active'),
        ).toBeVisible();
    });
});
