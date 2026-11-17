import { use, useEffect, useEffectEvent } from 'react';

import { shellStore } from '../shell-store.js';
import { TabProvider } from '../tab/tab-context.js';

/**
 * Runs once in the tab that was just opened, as its parts come in: where a tab puts the focus on
 * its first field. A tab brought to the front again, or back with the session, was not just
 * opened and hears nothing; outside a tab there is nothing to hear.
 */
export function useTabOpened(onOpened: () => void): void {
    const tabId = use(TabProvider)?.tabId;
    const opened = useEffectEvent(onOpened);

    useEffect(() => {
        if (tabId === undefined || shellStore.getState().openedTabId !== tabId) {
            return;
        }

        shellStore.setState({ openedTabId: null });
        opened();
    }, [tabId]);
}
