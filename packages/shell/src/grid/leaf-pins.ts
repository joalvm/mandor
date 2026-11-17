import type { GridLeaf, GridNode } from '@mandor/ipc';

import type { Tab } from '../tab/tab.js';
import { groupOfTab } from './grid-leaf.js';

export function isPinnedTab(grid: GridNode, tabId: string): boolean {
    return groupOfTab(grid, tabId)?.tabs.find((tab) => tab.id === tabId)?.pinned === true;
}

/** The pinned before the rest, each side in the order it already had. */
export function pinnedFirst(tabs: readonly Tab[]): Tab[] {
    return [
        ...tabs.filter((tab) => tab.pinned === true),
        ...tabs.filter((tab) => tab.pinned !== true),
    ];
}

/**
 * The pinned stand first in every group of the tree, whatever put them elsewhere. A group already
 * in order is handed back as it was, so it does not look new to whoever is subscribed to it.
 */
export function pinnedFirstGrid(node: GridNode): GridNode {
    if (node.kind === 'leaf') {
        const tabs = pinnedFirst(node.tabs);

        return tabs.every((tab, index) => tab === node.tabs[index]) ? node : { ...node, tabs };
    }

    const children = node.children.map(pinnedFirstGrid);

    return children.every((child, index) => child === node.children[index])
        ? node
        : { ...node, children };
}

/** Rewrites one tab of the group and puts the pinned first again, or hands the group back. */
function withChanged(leaf: GridLeaf, tabId: string, change: (tab: Tab) => Tab | null): GridLeaf {
    const index = leaf.tabs.findIndex((tab) => tab.id === tabId);
    const tab = leaf.tabs[index];
    const changed = tab === undefined ? null : change(tab);

    return changed === null ? leaf : { ...leaf, tabs: pinnedFirst(leaf.tabs.with(index, changed)) };
}

/**
 * Pins a tab: it goes after the pinned already there. Pinning is choosing, so one open only to
 * look at it is kept as well.
 */
export function withPinnedTab(leaf: GridLeaf, tabId: string): GridLeaf {
    return withChanged(leaf, tabId, (tab) => {
        if (tab.pinned === true) {
            return null;
        }

        const pinned: Tab = { ...tab, pinned: true };

        delete pinned.preview;

        return pinned;
    });
}

/** Lets a pinned tab go: it becomes the first of the rest, next to where it stood. */
export function withUnpinnedTab(leaf: GridLeaf, tabId: string): GridLeaf {
    return withChanged(leaf, tabId, (tab) => {
        if (tab.pinned !== true) {
            return null;
        }

        const loose = { ...tab };

        delete loose.pinned;

        return loose;
    });
}
