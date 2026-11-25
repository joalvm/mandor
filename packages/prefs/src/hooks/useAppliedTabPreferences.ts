import type { ResolvedPreferenceValues } from '@mandor/schema';
import { tabPreferences } from '@mandor/shell';
import { useLayoutEffect } from 'react';

/**
 * Hands the tabs of the window the way the person set them, before a tab restored open can close
 * or open another, and at every change. The window that unmounts gives back the default behavior.
 */
export function useAppliedTabPreferences(values: ResolvedPreferenceValues): void {
    const alwaysNew = values['tabs.alwaysNew'] === 'on';
    const askUnsaved = values['tabs.askUnsaved'] === 'on';
    const closedKept = Number(values['tabs.closedKept']);

    useLayoutEffect(() => {
        tabPreferences.setState({ alwaysNew, askUnsaved, closedKept });

        return () => {
            tabPreferences.setState(tabPreferences.getInitialState());
        };
    }, [alwaysNew, askUnsaved, closedKept]);
}
