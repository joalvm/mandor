import { leavesOf, ROOT_GROUP_ID, type GridAxis, type GridLeaf, type GridNode } from '@mandor/ipc';

import { flattenedGrid } from './grid-flatten.js';
import { groupOfTab, leafOf, mapLeaf } from './grid-leaf.js';
import { mapTabs } from './grid-tabs.js';
import { resizedGrid } from './grid-sashes.js';
import { splitLeaf } from './grid-split.js';
import { withoutLeaf } from './grid-close.js';
import { pinnedFirstGrid, withPinnedTab, withUnpinnedTab } from './leaf-pins.js';
import { keptTab, withKeptTab, withPreviewTab, withReorderedTabs } from './leaf-preview.js';
import { withTab, withTabAt, withoutTab } from './leaf-tabs.js';
import { resourceIndexOf, type ResourceIndex } from '../resource/resource-index.js';
import { movedResource } from '../resource/resource-move.js';
import type { ClosedTab } from '../tab/closed-tabs.js';
import type { Tab } from '../tab/tab.js';

/** The three fields that always change together: the tree, what has the focus, and the index. */
export type Layout = {
    activeGroupId: string;
    grid: GridNode;
    resources: ResourceIndex;
};

/**
 * The one way a layout is built. It rebuilds the index from the tree, refuses to leave the focus
 * on a group that is no longer there, and never lets two splits of the same axis nest, so no
 * action has to remember to do any of the three.
 *
 * Splitting nests by construction, and a row inside a row is the same three groups side by side
 * written two ways. One of the two spellings has to win before anything reads the tree — the
 * view, the separators, the session on disk — because the other one draws the same window with
 * a different set of handles.
 *
 * The pinned tabs of every group stand first too, whichever drag or move put one elsewhere.
 */
export function laidOut(before: Layout, node: GridNode, focused: string): Layout {
    const grid = pinnedFirstGrid(flattenedGrid(node));
    const groups = leavesOf(grid);
    const known = groups.some((leaf) => leaf.id === focused);

    return {
        activeGroupId: known ? focused : (groups[0]?.id ?? ROOT_GROUP_ID),
        grid,
        resources: resourceIndexOf(grid, before.resources),
    };
}

/** How a tab is opened: only to look at it, or to keep. */
export type OpenTabOptions = {
    preview: boolean;
};

/**
 * A tab already open anywhere is shown where it is, never opened a second time elsewhere. Asked
 * for to keep, a tab that was open only to look at it is kept.
 */
export function tabOpened(
    layout: Layout,
    groupId: string,
    tab: Tab,
    { preview }: OpenTabOptions = { preview: false },
): Layout {
    const open = groupOfTab(layout.grid, tab.id);
    const target = open?.id ?? groupId;
    const opened = (leaf: GridLeaf) =>
        preview ? withPreviewTab(leaf, tab) : withTab(withKeptTab(leaf, tab.id), keptTab(tab));

    return laidOut(layout, mapLeaf(layout.grid, target, opened), target);
}

/**
 * A closed tab comes back to the group it left and the place it had, with the focus. A group
 * that is gone sends it to the end of the focused one, and a tab already open again is only shown.
 */
export function tabReopened(layout: Layout, { groupId, index, tab }: ClosedTab): Layout {
    if (
        groupOfTab(layout.grid, tab.id) !== undefined ||
        leafOf(layout.grid, groupId) === undefined
    ) {
        return tabOpened(layout, layout.activeGroupId, tab);
    }

    const grid = mapLeaf(layout.grid, groupId, (leaf) => withTabAt(leaf, tab, index));

    return laidOut(layout, grid, groupId);
}

export function tabKept(layout: Layout, tabId: string): Layout {
    const group = groupOfTab(layout.grid, tabId);

    if (group === undefined) {
        return layout;
    }

    return { ...layout, grid: mapLeaf(layout.grid, group.id, (leaf) => withKeptTab(leaf, tabId)) };
}

/** Pinning or letting go of a tab, wherever in the window it is open. */
export function tabPinned(layout: Layout, tabId: string, pinned: boolean): Layout {
    const group = groupOfTab(layout.grid, tabId);

    if (group === undefined) {
        return layout;
    }

    const change = (leaf: GridLeaf) =>
        pinned ? withPinnedTab(leaf, tabId) : withUnpinnedTab(leaf, tabId);

    return { ...layout, grid: mapLeaf(layout.grid, group.id, change) };
}

export function tabsReordered(layout: Layout, groupId: string, tabIds: string[]): Layout {
    return {
        ...layout,
        grid: mapLeaf(layout.grid, groupId, (leaf) => withReorderedTabs(leaf, tabIds)),
    };
}

export function tabClosed(layout: Layout, groupId: string, tabId: string): Layout {
    const grid = mapLeaf(layout.grid, groupId, (leaf) => withoutTab(leaf, tabId));

    return emptyGroupsGone({ ...layout, grid }, groupId);
}

export function tabMoved(layout: Layout, tabId: string, toGroupId: string): Layout {
    const from = groupOfTab(layout.grid, tabId);
    const tab = from?.tabs.find((each) => each.id === tabId);

    if (from === undefined || tab === undefined || from.id === toGroupId) {
        return layout;
    }

    // Carrying a tab to another group is choosing it: it arrives kept.
    const added = mapLeaf(layout.grid, toGroupId, (leaf) => withTab(leaf, keptTab(tab)));
    const grid = mapLeaf(added, from.id, (leaf) => withoutTab(leaf, tabId));

    return emptyGroupsGone({ ...layout, activeGroupId: toGroupId, grid }, from.id);
}

export function groupClosed(layout: Layout, groupId: string): Layout {
    return laidOut(layout, withoutLeaf(layout.grid, groupId), layout.activeGroupId);
}

export function groupSplit(layout: Layout, groupId: string, axis: GridAxis, id: string): Layout {
    return laidOut(layout, splitLeaf(layout.grid, groupId, axis, id), layout.activeGroupId);
}

/** What a drag or an arrow key on a separator leaves behind: the same tree, shared out anew. */
export function gridResized(layout: Layout, path: number[], index: number, delta: number): Layout {
    return laidOut(layout, resizedGrid(layout.grid, path, index, delta), layout.activeGroupId);
}

/**
 * A resource that moved on disk takes with it every tab that was looking at it, wherever in
 * the window they are open, and every tab of what was inside it when it was a folder.
 */
export function resourceMoved(layout: Layout, from: string, to: string): Layout {
    const grid = mapTabs(layout.grid, (tab) => renamed(tab, movedResource(tab.resource, from, to)));

    return laidOut(layout, grid, layout.activeGroupId);
}

/**
 * A resource deleted under the app is marked, never closed. What was on screen stays on screen,
 * and letting go of it is the decision of whoever was looking at it.
 */
export function resourceRemoved(layout: Layout, resource: string): Layout {
    const entry = layout.resources[resource];

    if (entry === undefined) {
        return layout;
    }

    return {
        ...layout,
        resources: { ...layout.resources, [resource]: { ...entry, missing: true } },
    };
}

/** A group with no tabs left has nothing to draw, so it gives its space back to its sibling. */
function emptyGroupsGone(layout: Layout, groupId: string): Layout {
    const leaf = leafOf(layout.grid, groupId);

    if (leaf?.tabs.length === 0) {
        return groupClosed(layout, groupId);
    }

    return laidOut(layout, layout.grid, layout.activeGroupId);
}

/** A tab keeps its identity when its resource moves: the same view, of another name. */
function renamed(tab: Tab, resource: string): Tab {
    return tab.resource === resource ? tab : { ...tab, resource };
}
