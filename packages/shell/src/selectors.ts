import { leavesOf, type GridLeaf, type GridNode } from '@mandor/ipc';

import { groupOfTab, leafOf } from './grid/grid-leaf.js';
import type { ShellStore } from './shell-store.js';
import type { Tab } from './tab/tab.js';

const EMPTY_TABS: Tab[] = [];

export function selectActiveGroup(state: ShellStore): GridLeaf | undefined {
    return leafOf(state.grid, state.activeGroupId);
}

/** The tabs of the focused group, straight off the tree so the reference stays put. */
export function selectTabs(state: ShellStore): readonly Tab[] {
    return selectActiveGroup(state)?.tabs ?? EMPTY_TABS;
}

/** The resource a tab looks at, wherever in the window the tab is; nothing when it is not open. */
export function selectResourceOfTab(state: ShellStore, tabId: string): string | null {
    return groupOfTab(state.grid, tabId)?.tabs.find((tab) => tab.id === tabId)?.resource ?? null;
}

/**
 * Which group holds a tab, looked for in the whole window and not only where the focus is.
 *
 * A tab is open once, in one group. Asking the focused group whether something is open answers
 * no as soon as the user moves the focus elsewhere, and whoever asked opens it a second time.
 */
export function selectGroupOfTab(state: ShellStore, tabId: string): string | null {
    return groupOfTab(state.grid, tabId)?.id ?? null;
}

/**
 * Whether some group is showing a tab right now: a group shows its active tab, wherever the
 * focus is, so a tab behind another one in its group, or not open at all, is not on screen.
 */
export function selectTabShown(state: ShellStore, tabId: string): boolean {
    return groupOfTab(state.grid, tabId)?.activeTab === tabId;
}

export function selectActiveTabId(state: ShellStore): string | null {
    return selectActiveGroup(state)?.activeTab ?? null;
}

/** Nothing is remembered for a resource until somebody moves off the section it opens on. */
export function selectSection(state: ShellStore, resource: string): string | null {
    return state.sections[resource] ?? null;
}

/** The list for each grid asked about, so a caller that asks twice gets the same array back. */
const OPEN_RESOURCES = new WeakMap<GridNode, readonly string[]>();

/**
 * Every resource some tab of the window looks at, once, in the order the groups stand. Whoever
 * has to find the tabs of what it just moved or deleted asks here instead of walking the grid.
 */
export function selectOpenResources(state: ShellStore): readonly string[] {
    const known = OPEN_RESOURCES.get(state.grid);

    if (known !== undefined) {
        return known;
    }

    const resources = [
        ...new Set(leavesOf(state.grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.resource))),
    ];

    OPEN_RESOURCES.set(state.grid, resources);

    return resources;
}
