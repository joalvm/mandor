import { usePreferenceValue } from '@mandor/prefs';
import { fireAndForget } from '@mandor/shell';
import { useEffect } from 'react';

import { syncBridge } from '../../../app/sync-bridge.js';

/**
 * Tells main how much of the history to keep. Main writes the sends and prunes them, but the
 * settings live in the window: it hears them at start and at every change, and the next send
 * is pruned by them.
 */
export function useHistoryRetention(): void {
    const maxEntries = Number(usePreferenceValue('history.maxEntries'));
    const maxAgeDays = Number(usePreferenceValue('history.maxAgeDays'));

    useEffect(() => {
        fireAndForget(syncBridge.history.configure({ maxAgeDays, maxEntries }));
    }, [maxAgeDays, maxEntries]);
}
