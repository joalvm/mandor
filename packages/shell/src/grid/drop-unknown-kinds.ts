import { leavesOf, type GridNode } from '@mandor/ipc';

import { tabKind } from '../tab/tab-kind-registry.js';
import { withoutLeaf } from './grid-close.js';

/**
 * Leaves out of a restored window what this build has no way to draw. A session names the kind
 * of every tab it saved, and a build that dropped one of those kinds has neither a title nor a
 * body for it. The tab goes, and the group it leaves empty closes behind it, because a split
 * held open by nothing would be worse than the arrangement the window lost.
 *
 * Nothing is migrated on disk: what those tabs were views of is untouched, and the next save
 * writes the window as it now stands.
 */
export function dropUnknownKinds(node: GridNode): GridNode {
    const known = withKnownTabs(node);
    const emptied = leavesOf(known)
        .filter((leaf) => leaf.tabs.length === 0)
        .map((leaf) => leaf.id);

    return emptied.reduce((grid, groupId) => withoutLeaf(grid, groupId), known);
}

function withKnownTabs(node: GridNode): GridNode {
    if (node.kind === 'branch') {
        return { ...node, children: node.children.map(withKnownTabs) };
    }

    const tabs = node.tabs.filter((tab) => tabKind(tab.kind) !== undefined);
    const shown = tabs.some((tab) => tab.id === node.activeTab);

    return { ...node, tabs, activeTab: shown ? node.activeTab : (tabs[0]?.id ?? null) };
}
