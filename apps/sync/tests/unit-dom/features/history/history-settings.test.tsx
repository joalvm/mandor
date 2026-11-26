import { success } from '@mandor/ipc';
import { openSettings, SettingsDialog } from '@mandor/prefs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { HistorySettings } from '../../../../src/renderer/features/history/HistorySettings.js';
import { AppProviders } from '../../support/app-providers.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('how much of the history is kept, as the settings say', () => {
    /** Main prunes the sends, and it cannot read the settings: the window tells it. */
    it('tells main what to keep at start, and again when a count is picked', async () => {
        const configure = vi.spyOn(syncBridge.history, 'configure').mockResolvedValue(success({}));

        render(
            <>
                <HistorySettings />
                <SettingsDialog />
            </>,
            { wrapper: AppProviders },
        );

        expect(configure).toHaveBeenLastCalledWith({ maxAgeDays: 30, maxEntries: 500 });

        act(() => {
            openSettings('history');
        });

        const choice = await screen.findByRole('combobox', { name: 'Keep sends for' });

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: '7 days' }));

        expect(configure).toHaveBeenLastCalledWith({ maxAgeDays: 7, maxEntries: 500 });
    });
});
