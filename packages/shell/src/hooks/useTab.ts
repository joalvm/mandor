import { use, useCallback } from 'react';

import { isPreviewTab } from '../grid/leaf-preview.js';
import { shellStore } from '../shell-store.js';
import { TabProvider, type TabContextValue } from '../tab/tab-context.js';
import { useShellStore } from './useShellStore.js';

type TabView = TabContextValue & {
    /** Makes the tab stay: whatever edits what it holds calls this, the shell never guesses. */
    keep: () => void;
    /** Opened only to look at it: the next look replaces it. */
    preview: boolean;
};

/**
 * The tab this piece is drawn for. A part declared once in a kind serves every tab of it, so it
 * never receives the tab as a prop: it asks here. Outside a tab there is nothing to answer.
 */
export function useTab(): TabView {
    const tab = use(TabProvider);
    const tabId = tab?.tabId ?? '';
    const preview = useShellStore((state) => isPreviewTab(state.grid, tabId));
    const keep = useKeepTab();

    if (tab === null) {
        throw new Error('useTab is only read inside a tab: the group or the strip draws it.');
    }

    return { ...tab, keep, preview };
}

/**
 * The keep of the tab this piece is drawn in, and nothing outside one: a panel that edits is
 * also drawn on its own, by a test or a page that is not a tab, and there it has nothing to keep.
 */
export function useKeepTab(): () => void {
    const tabId = use(TabProvider)?.tabId;

    return useCallback(() => {
        if (tabId !== undefined) {
            shellStore.getState().keepTab(tabId);
        }
    }, [tabId]);
}
