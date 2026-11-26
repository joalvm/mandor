import { leavesOf, type GridNode } from '@mandor/ipc';

import { tabsByName } from '../grid/grid-tabs.js';
import { keptTab } from '../grid/leaf-preview.js';
import type { ResourceIndex } from '../resource/resource-index.js';
import { movedResource } from '../resource/resource-move.js';
import type { Tab } from './tab.js';
import { tabKind } from './tab-kind-registry.js';
import { tabPreferences } from './tab-preferences.js';

/** A tab that left the window: what it was, the group that held it and its place in the strip. */
export type ClosedTab = { groupId: string; index: number; tab: Tab };

/**
 * The last one closed goes on top; a tab closed again replaces its older self. Past the reach the
 * person set, closing one more forgets the oldest.
 */
function withClosed(closed: readonly ClosedTab[], entry: ClosedTab): readonly ClosedTab[] {
    const older = closed.filter((each) => each.tab.id !== entry.tab.id);

    return [entry, ...older].slice(0, tabPreferences.getState().closedKept);
}

/** Whether a tab that left has something to come back to. */
function returns(tab: Tab, resources: ResourceIndex): boolean {
    return resources[tab.resource]?.missing !== true && tabKind(tab.kind)?.reopenable !== false;
}

/**
 * What the window remembers after a change of its tree: every tab that was there before and is
 * not anywhere now, however it went — closed, replaced by the next look, gone with its group. A
 * tab that only moved keeps its name and is not counted, and one whose resource is gone from disk
 * has nothing to come back to, nor one of a kind that lets go of its thing as it closes.
 * Reopening is choosing, so it comes back kept.
 */
export function closedAfter(
    closed: readonly ClosedTab[],
    before: GridNode,
    resources: ResourceIndex,
    after: GridNode,
): readonly ClosedTab[] {
    const still = tabsByName(after);
    const gone = leavesOf(before).flatMap((leaf) =>
        leaf.tabs.flatMap((tab, index) =>
            still.has(tab.id) || !returns(tab, resources)
                ? []
                : [{ groupId: leaf.id, index, tab: keptTab(tab) }],
        ),
    );

    return gone.length === 0 ? closed : gone.reduce(withClosed, closed);
}

/** A resource deleted on disk, and everything under it, can no longer be reopened. */
export function closedWithout(
    closed: readonly ClosedTab[],
    resource: string,
): readonly ClosedTab[] {
    return closed.filter(
        (each) => each.tab.resource !== resource && !each.tab.resource.startsWith(`${resource}/`),
    );
}

/** A resource that moved on disk takes its closed tabs along, like the open ones. */
export function closedMoved(
    closed: readonly ClosedTab[],
    from: string,
    to: string,
): readonly ClosedTab[] {
    return closed.map((each) => {
        const resource = movedResource(each.tab.resource, from, to);

        return resource === each.tab.resource ? each : { ...each, tab: { ...each.tab, resource } };
    });
}
