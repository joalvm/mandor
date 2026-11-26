import { PreferencesProvider } from '@mandor/prefs';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { activityKept } from '../../../src/renderer/activity/activity-kept.js';
import { useAppliedActivityKept } from '../../../src/renderer/activity/hooks/useAppliedActivityKept.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('the count of activity the window keeps (useAppliedActivityKept)', () => {
    it('is what the person kept from an earlier run, and the first one again when the window goes', () => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'activity.maxEntries': '2000' }),
        );

        const { unmount } = renderHook(
            () => {
                useAppliedActivityKept();
            },
            { wrapper: PreferencesProvider },
        );

        expect(activityKept.getState().entries).toBe(2000);

        unmount();

        expect(activityKept.getState()).toEqual(activityKept.getInitialState());
    });
});
