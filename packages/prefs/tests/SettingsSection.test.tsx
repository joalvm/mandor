import { MessagesProvider } from '@mandor/i18n';
import { registerShellCommands } from '@mandor/shell';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SettingsDialog } from '../src/components/dialog/SettingsDialog.js';
import { PreferencesProvider } from '../src/preferences-context.js';
import { registerSettingsSurface } from '../src/register-settings-surface.js';
import { SettingsSection } from '../src/index.js';
import { openSettings, settingsDialogStore } from '../src/settings-dialog-store.js';

/** The dialog, with whatever the app wrote beside it in the tree. */
function settings(added: ReactNode) {
    return (
        <MessagesProvider preferences={{}}>
            <PreferencesProvider>
                <TooltipProvider>
                    {added}
                    <SettingsDialog />
                </TooltipProvider>
            </PreferencesProvider>
        </MessagesProvider>
    );
}

const REQUESTS = (
    <SettingsSection icon="send" id="requests" titleKey="preferences:shortcutsTitle">
        <p>request defaults</p>
    </SettingsSection>
);

let unregister: () => void;
let unregisterCommands: () => void;

beforeEach(() => {
    window.localStorage.clear();
    unregister = registerSettingsSurface();
    unregisterCommands = registerShellCommands();
});

afterEach(() => {
    cleanup();
    settingsDialogStore.getState().close();

    unregisterCommands();
    unregister();
});

describe('a section of the settings declared in the tree', () => {
    it('is laid between the sections of the dialog and the network, and opens at it', () => {
        const view = render(settings(REQUESTS));

        act(() => {
            openSettings('requests');
        });

        const names = screen.getAllByRole('option').map((option) => option.textContent);

        expect(names).toEqual([
            'General',
            'Themes',
            'Keyboard shortcuts',
            'Scripts',
            'Proxy',
            'Certificates',
            'Updates',
            'Shortcuts',
            'About',
        ]);
        expect(screen.getByText('request defaults')).toBeVisible();

        view.rerender(settings(null));

        expect(screen.getAllByRole('option')).toHaveLength(8);
    });

    it('is one section however many times it draws', () => {
        const view = render(settings(REQUESTS));

        view.rerender(settings(REQUESTS));

        expect(settingsDialogStore.getState().sections).toHaveLength(1);

        view.unmount();

        expect(settingsDialogStore.getState().sections).toHaveLength(0);
    });
});
