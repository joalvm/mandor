import { usePreferenceValue } from '@mandor/prefs';
import { useLayoutEffect } from 'react';

import { activityKept } from '../activity-kept.js';
import { activityStore } from '../activity-store.js';

/**
 * Keeps every timeline of the window to the count the person chose. A lower count is felt at
 * once: what lies past it goes now, not at the next frame of each connection.
 */
export function useAppliedActivityKept(): void {
    const entries = Number(usePreferenceValue('activity.maxEntries'));

    useLayoutEffect(() => {
        activityKept.setState({ entries });
        activityStore.getState().trimActivity();

        return () => {
            activityKept.setState(activityKept.getInitialState());
        };
    }, [entries]);
}
