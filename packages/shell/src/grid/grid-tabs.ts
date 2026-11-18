import { leavesOf, type GridLeaf, type GridNode } from '@mandor/ipc';

import type { Tab } from '../tab/tab.js';

/** Every tab of the window by name, which is all a view hands back about the tabs it moved. */
export function tabsByName(node: GridNode): Map<string, Tab> {
    return new Map(leavesOf(node).flatMap((leaf) => leaf.tabs.map((tab) => [tab.id, tab])));
}

/**
 * Rewrites the tabs of every group and hands back by reference everything the change did not
 * touch, so a rename in one group does not make the rest of the window look new to whoever is
 * subscribed to it.
 */
export function mapTabs(node: GridNode, change: (tab: Tab) => Tab): GridNode {
    if (node.kind === 'leaf') {
        return leafWith(node, node.tabs.map(change));
    }

    const children = node.children.map((child) => mapTabs(child, change));

    return same(node.children, children) ? node : { ...node, children };
}

function leafWith(leaf: GridLeaf, tabs: Tab[]): GridNode {
    return same(leaf.tabs, tabs) ? leaf : { ...leaf, tabs };
}

function same<T>(before: readonly T[], after: readonly T[]): boolean {
    return after.every((item, index) => item === before[index]);
}
