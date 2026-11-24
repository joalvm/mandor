import { leavesOf, type GridNode } from '@mandor/ipc';
import type { DockviewGroupPanel, IDockviewGroupPanel } from 'dockview';

import { dockviewLayoutOf } from './dockview-layout.js';
import type { Tab } from '../tab/tab.js';

/** What pointing reads of a group: its tabs, the one in front, and how to bring either forward. */
type PointableGroup = Pick<IDockviewGroupPanel, 'activePanel' | 'panels'> & {
    api: Pick<IDockviewGroupPanel['api'], 'setActive'>;
    model: Pick<IDockviewGroupPanel['model'], 'openPanel'>;
};

/** What pointing reads of the view: the group in front, and any group by its name. */
export type PointableView = {
    activeGroup: Pick<DockviewGroupPanel, 'id'> | undefined;
    getGroup: (id: string) => PointableGroup | undefined;
};

/** The tree with no tab in front of any group: what a grid is, before anybody points into it. */
function unpointed(node: GridNode): GridNode {
    if (node.kind === 'leaf') {
        return { ...node, activeTab: null };
    }

    return { ...node, children: node.children.map(unpointed) };
}

/**
 * What the grid is built from, as text: the groups, their tabs and their titles, and nothing a
 * click changes. Two trees that differ only in what is in front build the same grid.
 */
export function gridStructureOf(grid: GridNode, titleOf: (tab: Tab) => string): string {
    return JSON.stringify(dockviewLayoutOf(unpointed(grid), '', titleOf));
}

/** What a click changes, as text: the tab each group has in front, and the group in front. */
export function gridPointingOf(grid: GridNode, activeGroupId: string): string {
    return JSON.stringify([activeGroupId, leavesOf(grid).map((leaf) => [leaf.id, leaf.activeTab])]);
}

/**
 * Puts in front, in a grid already built, the tab each group of the tree has in front and the
 * group the window is on. Building the grid again for a click would tear down every panel under
 * the gesture that made it: a drag that starts on a tab of another group would die at once.
 */
export function pointGrid(api: PointableView, grid: GridNode, activeGroupId: string): void {
    for (const leaf of leavesOf(grid)) {
        const group = api.getGroup(leaf.id);
        const front = group?.panels.find((panel) => panel.id === leaf.activeTab);

        if (group !== undefined && front !== undefined && group.activePanel !== front) {
            group.model.openPanel(front, { skipSetGroupActive: true });
        }
    }

    if (api.activeGroup?.id !== activeGroupId) {
        api.getGroup(activeGroupId)?.api.setActive();
    }
}
