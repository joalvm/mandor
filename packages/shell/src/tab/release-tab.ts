import { leavesOf, type GridNode } from '@mandor/ipc';

import { groupOfTab, leafOf } from '../grid/grid-leaf.js';
import { previewTabOf } from '../grid/leaf-preview.js';
import { tabKind } from './tab-kind-registry.js';
import type { Tab } from './tab.js';

/**
 * Tells the kind that one of its tabs is about to leave the window. It runs before the tree is
 * rewritten, because that is the last moment the tab is still there to be asked what kind it is.
 */
export function releaseTab(grid: GridNode, tabId: string): void {
    const tab = groupOfTab(grid, tabId)?.tabs.find((each) => each.id === tabId);

    if (tab === undefined || stillOpenElsewhere(grid, tab)) {
        return;
    }

    tabKind(tab.kind)?.release?.(tabId, tab.resource);
}

/**
 * Opening a tab only to look at it replaces the one the group was looking at before, and that
 * one leaves the window the way a closed tab does. A tab already open is only shown, and
 * replaces nothing.
 */
export function releaseReplacedPreview(grid: GridNode, groupId: string, tab: Tab): void {
    if (groupOfTab(grid, tab.id) !== undefined) {
        return;
    }

    const replaced = leafOf(grid, groupId);
    const preview = replaced === undefined ? undefined : previewTabOf(replaced);

    if (preview !== undefined && preview.resource !== tab.resource) {
        releaseTab(grid, preview.id);
    }
}

/** Two views of one thing hold it once: the first to close cannot take it from the second. */
function stillOpenElsewhere(grid: GridNode, tab: Tab): boolean {
    return leavesOf(grid).some((leaf) =>
        leaf.tabs.some((each) => each.id !== tab.id && each.resource === tab.resource),
    );
}
