import type { GridLeaf, GridNode } from '@mandor/ipc';

import type { Tab } from '../tab/tab.js';
import { groupOfTab } from './grid-leaf.js';
import { withTabOrder } from './leaf-tabs.js';

/** The tab a group shows provisionally, waiting for the next look to replace it. */
export function previewTabOf(leaf: GridLeaf): Tab | undefined {
    return leaf.tabs.find((tab) => tab.preview === true);
}

export function isPreviewTab(grid: GridNode, tabId: string): boolean {
    return groupOfTab(grid, tabId)?.tabs.find((tab) => tab.id === tabId)?.preview === true;
}

/** The same tab, kept: the mark goes, and nothing else about it changes. */
export function keptTab(tab: Tab): Tab {
    const kept = { ...tab };

    delete kept.preview;

    return kept;
}

/**
 * Opens a tab only to look at it. A group holds one such tab, and the next look takes its place
 * instead of being added after it, so the strip does not jump. What is already open is only
 * shown, as provisional or as kept as it was.
 */
export function withPreviewTab(leaf: GridLeaf, tab: Tab): GridLeaf {
    if (leaf.tabs.some((each) => each.id === tab.id)) {
        return { ...leaf, activeTab: tab.id };
    }

    const provisional: Tab = { ...tab, preview: true };
    const index = leaf.tabs.findIndex((each) => each.preview === true);
    const tabs = index < 0 ? [...leaf.tabs, provisional] : leaf.tabs.with(index, provisional);

    return { ...leaf, tabs, activeTab: tab.id };
}

/** Keeping a tab that is already kept, or not there, hands back the very same group. */
export function withKeptTab(leaf: GridLeaf, tabId: string): GridLeaf {
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId && tab.preview === true);
    const tab = leaf.tabs[index];

    return tab === undefined ? leaf : { ...leaf, tabs: leaf.tabs.with(index, keptTab(tab)) };
}

/**
 * A new order for the strip. Dragging the provisional tab is choosing it, so it is kept; another
 * tab dragged past it leaves it as it was. The one dragged is the one whose leaving makes the
 * rest read the same before and after.
 */
export function withReorderedTabs(leaf: GridLeaf, tabIds: readonly string[]): GridLeaf {
    const ordered = withTabOrder(leaf, tabIds);
    const preview = previewTabOf(leaf);

    if (ordered === leaf || preview === undefined) {
        return ordered;
    }

    const without = (ids: readonly string[]) => ids.filter((id) => id !== preview.id).join('\n');
    const dragged = without(leaf.tabs.map((tab) => tab.id)) === without(tabIds);
    const moved =
        ordered.tabs.findIndex((tab) => tab.id === preview.id) !==
        leaf.tabs.findIndex((tab) => tab.id === preview.id);

    return dragged && moved ? withKeptTab(ordered, preview.id) : ordered;
}
