import { success } from '@mandor/ipc';
import { PreferencesProvider } from '@mandor/prefs';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { useHistoryRetention } from '../../../../src/renderer/features/history/hooks/useHistoryRetention.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('what main keeps of the history (useHistoryRetention)', () => {
    it('hands main what the person kept from an earlier run, as numbers', () => {
        const configure = vi.spyOn(syncBridge.history, 'configure').mockResolvedValue(success({}));

        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'history.maxAgeDays': '365', 'history.maxEntries': '5000' }),
        );
        renderHook(
            () => {
                useHistoryRetention();
            },
            { wrapper: PreferencesProvider },
        );

        expect(configure).toHaveBeenCalledTimes(1);
        expect(configure).toHaveBeenCalledWith({ maxAgeDays: 365, maxEntries: 5000 });
    });
});
