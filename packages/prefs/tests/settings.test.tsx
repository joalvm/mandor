import { MessagesProvider } from '@mandor/i18n';
import { registerShellCommands, shellStore, windowSurface } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SettingsDialog } from '../src/components/dialog/SettingsDialog.js';
import { useSettingsInheritance } from '../src/hooks/useSettingsInheritance.js';
import { PreferencesProvider } from '../src/preferences-context.js';
import { PREFERENCE_STORAGE_KEY } from '../src/preferences-storage.js';
import { registerSettingsSurface } from '../src/register-settings-surface.js';
import { openSettings, settingsDialogStore } from '../src/settings-dialog-store.js';

let unregister: () => void;
let unregisterCommands: () => void;

function renderSettings() {
    return render(
        <MessagesProvider preferences={{}}>
            <PreferencesProvider>
                <TooltipProvider>
                    <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                        <SettingsDialog />
                    </ToastProvider>
                </TooltipProvider>
            </PreferencesProvider>
        </MessagesProvider>,
    );
}

function openAt(section?: string) {
    act(() => {
        openSettings(section);
    });
}

beforeEach(() => {
    // The dialog reopens where it was left, so each test starts from where a fresh window does.
    settingsDialogStore.setState({ section: settingsDialogStore.getInitialState().section });
    window.localStorage.clear();
    unregister = registerSettingsSurface();
    unregisterCommands = registerShellCommands();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    settingsDialogStore.getState().close();

    unregisterCommands();
    unregister();
});

describe('the settings of the app', () => {
    it('opens as a dialog from the surface the window asks by', () => {
        renderSettings();
        act(() => {
            windowSurface('settings')?.open(shellStore.getState());
        });

        expect(screen.getByRole('dialog', { name: 'General' })).toBeVisible();
    });

    it('writes a preference of the app from its row of PreferenceRows', async () => {
        renderSettings();
        openAt();

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Language' }), {
            key: 'ArrowDown',
        });
        fireEvent.click(await screen.findByRole('option', { name: 'Spanish' }));

        expect(window.localStorage.getItem(PREFERENCE_STORAGE_KEY)).toBe(
            JSON.stringify({ 'appearance.language': 'es' }),
        );
    });

    it('goes from section to section by the column', async () => {
        renderSettings();
        openAt();
        fireEvent.click(screen.getByRole('option', { name: 'Updates' }));

        expect(screen.getByRole('dialog', { name: 'Updates' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Channel' })).toBeVisible();
        // The version row asks main for its state; the test waits for the answer to land.
        await screen.findByText('Current version 0.0.0');
    });

    it('keeps the theme in Themes and the language in General', () => {
        renderSettings();
        openAt();

        expect(screen.getByRole('combobox', { name: 'Language' })).toBeVisible();
        expect(screen.queryByRole('combobox', { name: 'Appearance' })).toBeNull();

        fireEvent.click(screen.getByRole('option', { name: 'Themes' }));

        expect(screen.getByRole('dialog', { name: 'Themes' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Appearance' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Day theme' })).toBeVisible();
        expect(screen.getByRole('combobox', { name: 'Night theme' })).toBeVisible();
    });

    it('keeps whether scripts run and the way to forget their approvals in a section of their own', async () => {
        renderSettings();
        openAt('scripts');

        expect(screen.getByRole('dialog', { name: 'Scripts' })).toBeVisible();
        expect(await screen.findByRole('switch', { name: 'Run scripts' })).toBeChecked();
        expect(screen.getByRole('button', { name: 'Forget approvals' })).toBeVisible();
    });

    it('closes the column with the scripts, the network, the updates, the keys and the app itself', () => {
        renderSettings();
        openAt();

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
            'General',
            'Themes',
            'Scripts',
            'Proxy',
            'Certificates',
            'Updates',
            'Shortcuts',
            'About',
        ]);
    });

    it('lists the shortcuts in the ShortcutsList without making them editable', () => {
        renderSettings();
        openAt('shortcuts');

        expect(screen.getByText('Command palette')).toBeVisible();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('closes by its own way out', () => {
        renderSettings();
        openAt();
        fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(settingsDialogStore.getState().open).toBe(false);
    });

    it('opens at the first section when the one it was asked for is not there', () => {
        renderSettings();
        openAt('nowhere');

        expect(screen.getByRole('dialog', { name: 'General' })).toBeVisible();
    });

    /** A reader who came back to change the same thing again does not walk down to it twice. */
    it('reopens at the section left', () => {
        renderSettings();
        openAt();
        fireEvent.click(screen.getByRole('option', { name: 'Shortcuts' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
        openAt();

        expect(screen.getByRole('dialog', { name: 'Shortcuts' })).toBeVisible();
    });

    it('opens at the section it is asked for over the one it was left at', () => {
        renderSettings();
        openAt('shortcuts');
        fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
        openAt('themes');

        expect(screen.getByRole('dialog', { name: 'Themes' })).toBeVisible();
    });

    it('says where a row that follows the defaults takes them from, and leads there', () => {
        const { result } = renderHook(() => useSettingsInheritance('requests'), {
            wrapper: ({ children }) => (
                <MessagesProvider preferences={{ language: 'en' }}>{children}</MessagesProvider>
            ),
        });

        expect(result.current).toMatchObject({
            caption: 'Default from',
            place: 'Settings',
            resetLabel: 'Use the default',
        });

        act(() => {
            result.current.onFollow();
        });

        expect(settingsDialogStore.getState()).toMatchObject({ open: true, section: 'requests' });
    });
});
