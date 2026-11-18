import { EMPTY_UI_SESSION, ROOT_GROUP_ID } from '@mandor/ipc';

import type { Layout } from './grid/grid-changes.js';
import type { Panels } from './grid/panels.js';
import type { ClosedTab } from './tab/closed-tabs.js';
import type { Recency } from './tab/tab-recency.js';

/**
 * What the window shows, plus the group it is showing on its own.
 *
 * Maximising hides the rest of the groups without touching the tree underneath, and it is not
 * written down: a window is reopened showing everything it had, not the one group somebody was
 * reading when they closed it.
 */
export type UiSlice = Layout & {
    /**
     * What left the window, the latest first, for reopening. It lives with the window and not
     * with the session: an origin opened again starts with nothing to reopen.
     */
    closedTabs: readonly ClosedTab[];
    /** The group whose list of tabs is open, if one is. View state: it is never written down. */
    listingGroupId: string | null;
    maximizedGroupId: string | null;
    panels: Panels;
    /**
     * The resource the lateral was asked to show, until the section that lists it has scrolled
     * to it and let it go. View state: it is never written down.
     */
    revealing: string | null;
    /**
     * The tab that was just opened, until its parts come in and hear it: the one moment a tab
     * puts the focus on its first field. Never written down: a tab back with the session was not
     * just opened.
     */
    openedTabId: string | null;
    /** The order of use of the tabs of each group, for going back to the one used before. */
    recentTabs: Recency;
    /**
     * How far down the order of use a walk with the modifier held has gone, while it lasts. The
     * order stands still during the walk, so every step goes one further instead of back.
     */
    recentWalk: number | null;
    /**
     * Which section of a strip each resource was left on, by resource. It lives beside the
     * index and not inside a feature, so two strips over one item agree without either of
     * them knowing the other exists, and it is not written down: a window comes back with
     * every item on the section it opens on.
     */
    sections: Record<string, string>;
    /**
     * What each open tab holds beyond its place in the arrangement, by tab id — the draft a
     * composer was left with, for one. Features write it and read it back, and the window
     * decides nothing about what is inside: it only carries the bag to the session, which is
     * the one place it is written down.
     */
    tabState: Record<string, unknown>;
};

/** A window with one empty group. The root is always there, even with nothing open in it. */
export function initialLayout(): Layout {
    return {
        activeGroupId: ROOT_GROUP_ID,
        grid: { kind: 'leaf', id: ROOT_GROUP_ID, tabs: [], activeTab: null },
        resources: {},
    };
}

export function initialUiSlice(): UiSlice {
    return {
        ...initialLayout(),
        closedTabs: [],
        listingGroupId: null,
        maximizedGroupId: null,
        openedTabId: null,
        panels: { ...EMPTY_UI_SESSION.panels },
        recentTabs: {},
        recentWalk: null,
        revealing: null,
        sections: {},
        tabState: {},
    };
}

/** What a feature does to the bag of tab state the window carries to the session. */
export type TabStateActions = {
    setListingGroup: (groupId: string | null) => void;
    setRevealing: (resource: string | null) => void;
    setTabState: (tabState: Record<string, unknown>) => void;
};

export function tabStateActionsFor(
    set: (partial: Partial<UiSlice>) => void,
    persist: () => void,
): TabStateActions {
    return {
        setListingGroup: (listingGroupId) => {
            set({ listingGroupId });
        },
        setRevealing: (revealing) => {
            set({ revealing });
        },
        /**
         * The bag a feature keeps per tab — the draft a composer was left with, for one. The
         * window carries it to the session and reads nothing out of it; the feature that wrote
         * a key is the one that makes sense of it on the way back.
         */
        setTabState: (tabState) => {
            set({ tabState: { ...tabState } });
            persist();
        },
    };
}
