import { leavesOf, type GridLeaf, type GridNode } from '@mandor/ipc';
import { Orientation, type GroupviewPanelState, type SerializedDockview } from 'dockview';

import { flattenedGrid } from './grid-flatten.js';
import { WHOLE } from './grid-sashes.js';
import type { Tab } from '../tab/tab.js';

/** The one content component every tab is drawn with. Which view it is comes from its kind. */
export const TAB_COMPONENT = 'tab';

/** What travels with a panel through the view: enough to draw it, and nothing that cannot be
 * written down. */
export type TabParams = { kind: string; resource: string };

/** A node of the layout the view reads. The library names the shape but keeps the name to itself. */
type LayoutNode = SerializedDockview['grid']['root'];

/**
 * Reads the grid of the session as the layout the view draws.
 *
 * The session is the source and this is the projection of it, so nothing here reads back:
 * given the same tree it answers the same layout, and a tree that changed redraws from the
 * tree rather than from whatever the view happened to be showing.
 */
export function dockviewLayoutOf(
    grid: GridNode,
    activeGroupId: string,
    titleOf: (tab: Tab) => string,
): SerializedDockview {
    const flat = flattenedGrid(grid);

    return {
        grid: {
            root: rootOf(flat),
            width: WHOLE,
            height: WHOLE,
            orientation: orientationOf(flat),
        },
        panels: panelsOf(flat, titleOf),
        activeGroup: activeGroupId,
    };
}

/**
 * The root of the layout, which is a split even when there is a single group under it.
 *
 * The view keeps its separators in the root and refuses a layout that has a group there instead,
 * so a window that was never split is one group inside a split of one.
 */
function rootOf(node: GridNode): LayoutNode {
    const root = nodeOf(node, WHOLE);

    if (root.type === 'branch') {
        return root;
    }

    return { type: 'branch', size: WHOLE, data: [root] };
}

function orientationOf(node: GridNode): Orientation {
    return node.kind === 'branch' && node.axis === 'column'
        ? Orientation.VERTICAL
        : Orientation.HORIZONTAL;
}

/** A group with no tab in front says so by leaving the key out, not by writing an empty one. */
function leafDataOf(node: GridLeaf) {
    const views = { views: node.tabs.map((tab) => tab.id), id: node.id };

    return node.activeTab === null ? views : { ...views, activeView: node.activeTab };
}

function nodeOf(node: GridNode, size: number): LayoutNode {
    if (node.kind === 'leaf') {
        return { type: 'leaf', size, data: leafDataOf(node) };
    }

    return {
        type: 'branch',
        size,
        data: node.children.map((child, index) => nodeOf(child, node.sizes[index] ?? 0)),
    };
}

function panelsOf(
    node: GridNode,
    titleOf: (tab: Tab) => string,
): Record<string, GroupviewPanelState> {
    const entries = leavesOf(node).flatMap((leaf) =>
        leaf.tabs.map((tab) => [tab.id, panelOf(tab, titleOf)] as const),
    );

    return Object.fromEntries(entries);
}

function panelOf(tab: Tab, titleOf: (tab: Tab) => string): GroupviewPanelState {
    return {
        id: tab.id,
        contentComponent: TAB_COMPONENT,
        title: titleOf(tab),
        params: { kind: tab.kind, resource: tab.resource },
    };
}
