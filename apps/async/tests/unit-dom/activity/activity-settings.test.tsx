import { openSettings, SettingsDialog } from '@mandor/prefs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { NewActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import { activityKept } from '../../../src/renderer/activity/activity-kept.js';
import { activityStore } from '../../../src/renderer/activity/activity-store.js';
import { ActivitySettings } from '../../../src/renderer/activity/ActivitySettings.js';
import { selectActivityFor } from '../../../src/renderer/activity/select-activity-for.js';
import { AppProviders } from '../support/app-providers.js';

const ALPHA = 'mandor://demo/payments/connection/alpha';

function frames(count: number): NewActivityEntry[] {
    return Array.from({ length: count }, (_, at) => ({
        at,
        bytes: 8,
        detail: { at, code: 'unknown' },
        kind: 'connection-fault',
    }));
}

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('how much activity a connection keeps, as the settings say', () => {
    it('drops at once what lies past a lower count picked in the settings', async () => {
        activityStore.getState().appendActivity(ALPHA, frames(300));
        render(
            <>
                <ActivitySettings />
                <SettingsDialog />
            </>,
            { wrapper: AppProviders },
        );
        act(() => {
            openSettings('activity');
        });

        const choice = await screen.findByRole('combobox', { name: 'Entries kept per connection' });

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: '200 entries' }));

        expect(activityKept.getState().entries).toBe(200);
        expect(selectActivityFor(ALPHA)(activityStore.getState())).toHaveLength(200);
    });

    it('goes back to the first count when the window lets go of the settings', () => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'activity.maxEntries': '2000' }),
        );

        const { unmount } = render(<ActivitySettings />, { wrapper: AppProviders });

        expect(activityKept.getState().entries).toBe(2000);

        unmount();

        expect(activityKept.getState()).toEqual(activityKept.getInitialState());
    });
});
