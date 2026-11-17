import type { GridLeaf } from '@mandor/ipc';

import type { Tab } from '../tab/tab.js';
import { pinnedFirst } from './leaf-pins.js';

/** Opening what is already open shows it again. A group never holds one tab twice. */
export function withTab(leaf: GridLeaf, tab: Tab): GridLeaf {
    if (leaf.tabs.some((each) => each.id === tab.id)) {
        return { ...leaf, activeTab: tab.id };
    }

    return { ...leaf, tabs: [...leaf.tabs, tab], activeTab: tab.id };
}

/** A tab put back where it stood, or at the end of a strip that is shorter now. */
export function withTabAt(leaf: GridLeaf, tab: Tab, index: number): GridLeaf {
    return { ...leaf, tabs: leaf.tabs.toSpliced(index, 0, tab), activeTab: tab.id };
}

/**
 * Closing what was showing uncovers the tab to its right, the one the strip slides into place.
 * Only the last tab of the strip falls back to its left, because there is nothing else left.
 */
export function withoutTab(leaf: GridLeaf, tabId: string): GridLeaf {
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);

    if (index < 0) {
        return leaf;
    }

    const tabs = leaf.tabs.filter((tab) => tab.id !== tabId);
    const activeTab = leaf.activeTab === tabId ? neighbour(tabs, index) : leaf.activeTab;

    return { ...leaf, tabs, activeTab };
}

export function withActiveTab(leaf: GridLeaf, tabId: string | null): GridLeaf {
    if (tabId !== null && !leaf.tabs.some((tab) => tab.id === tabId)) {
        return leaf;
    }

    return { ...leaf, activeTab: tabId };
}

/**
 * An order naming anything the group does not hold is ignored whole, never applied in part. The
 * pinned keep standing first whatever the order asks.
 */
export function withTabOrder(leaf: GridLeaf, tabIds: readonly string[]): GridLeaf {
    const byId = new Map(leaf.tabs.map((tab) => [tab.id, tab]));
    const ordered = tabIds.flatMap((id) => {
        const tab = byId.get(id);

        return tab === undefined ? [] : [tab];
    });

    return ordered.length === leaf.tabs.length ? { ...leaf, tabs: pinnedFirst(ordered) } : leaf;
}

function neighbour(tabs: readonly Tab[], index: number): string | null {
    return tabs[index]?.id ?? tabs[index - 1]?.id ?? null;
}
