import type { GridNode } from '@mandor/ipc';

import {
    tabClosed,
    tabKept,
    tabMoved,
    tabOpened,
    tabPinned,
    tabsReordered,
    type Layout,
    type OpenTabOptions,
} from './grid-changes.js';
import { groupOfTab, mapLeaf } from './grid-leaf.js';
import { isPreviewTab } from './leaf-preview.js';
import { withActiveTab } from './leaf-tabs.js';
import { releaseReplacedPreview, releaseTab } from '../tab/release-tab.js';
import type { Tab } from '../tab/tab.js';
import { tabPreferences } from '../tab/tab-preferences.js';

/** What can be done to the tabs of a window, as opposed to the groups that hold them. */
export type TabActions = {
    closeTab: (groupId: string, tabId: string) => void;
    /** Turns a tab open only to look at it into one that stays; any other tab is left alone. */
    keepTab: (tabId: string) => void;
    moveTab: (tabId: string, toGroupId: string) => void;
    openTab: (groupId: string, tab: Tab, options?: OpenTabOptions) => void;
    /** Puts a tab with the pinned, first in its group and out of every closing of many. */
    pinTab: (tabId: string) => void;
    setActiveTab: (groupId: string, tabId: string | null) => void;
    setTabOrder: (groupId: string, tabIds: string[]) => void;
    unpinTab: (tabId: string) => void;
};

type TabActionsDeps = {
    grid: () => GridNode;
    /** Marks a tab that was not open anywhere as the one just opened. */
    opened: (tabId: string) => void;
    /** Forgets the sections of what is no longer open, once a tab has left the window. */
    pruneSections: () => void;
    relaid: (change: (layout: Layout) => Layout) => void;
};

export function tabActionsFor({ grid, opened, pruneSections, relaid }: TabActionsDeps): TabActions {
    return {
        closeTab: (groupId, tabId) => {
            releaseTab(grid(), tabId);
            relaid((layout) => tabClosed(layout, groupId, tabId));
            pruneSections();
        },
        /** Asked on every edit, so a tab already kept costs a lookup and not a save. */
        keepTab: (tabId) => {
            if (isPreviewTab(grid(), tabId)) {
                relaid((layout) => tabKept(layout, tabId));
            }
        },
        moveTab: (tabId, toGroupId) => {
            relaid((layout) => tabMoved(layout, tabId, toGroupId));
        },
        /**
         * A look that replaces another one closes it, so the one replaced goes as a closed tab.
         * Whoever always wants a new tab gets one that stays where a look would have opened.
         */
        openTab: (groupId, tab, asked = { preview: false }) => {
            const options = {
                ...asked,
                preview: asked.preview && !tabPreferences.getState().alwaysNew,
            };

            if (groupOfTab(grid(), tab.id) === undefined) {
                opened(tab.id);
            }

            if (!options.preview) {
                relaid((layout) => tabOpened(layout, groupId, tab, options));

                return;
            }

            releaseReplacedPreview(grid(), groupId, tab);
            relaid((layout) => tabOpened(layout, groupId, tab, options));
            pruneSections();
        },
        pinTab: (tabId) => {
            relaid((layout) => tabPinned(layout, tabId, true));
        },
        setActiveTab: (groupId, tabId) => {
            relaid((layout) => ({
                ...layout,
                grid: mapLeaf(layout.grid, groupId, (leaf) => withActiveTab(leaf, tabId)),
            }));
        },
        setTabOrder: (groupId, tabIds) => {
            relaid((layout) => tabsReordered(layout, groupId, tabIds));
        },
        unpinTab: (tabId) => {
            relaid((layout) => tabPinned(layout, tabId, false));
        },
    };
}
