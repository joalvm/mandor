import { leavesOf, type CoreBridge, type GridNode, type Result, type UiSession } from '@mandor/ipc';

import { dropUnknownKinds } from '../grid/drop-unknown-kinds.js';
import { tabOpened, type Layout } from '../grid/grid-changes.js';
import { flattenedGrid } from '../grid/grid-flatten.js';
import { tabsByName } from '../grid/grid-tabs.js';
import { resourceIndexOf } from '../resource/resource-index.js';
import type { ShellData } from '../shell-data.js';
import { openSections } from '../sidebar/open-sections.js';
import type { Tab } from '../tab/tab.js';

type Restored = Layout & Pick<ShellData, 'sections' | 'tabState'>;

/**
 * Reads the session main saved for an origin and makes it the state of the window. A session
 * written before the tree was normalised can still nest two splits of the same axis, and can
 * name a tab kind this build no longer draws. It is read the way it is drawn, not the way it
 * was stored.
 *
 * Main answers in its own time, and the window has drawn its buttons long before: a tab the user
 * opened while no origin was open yet, or while the answer was on its way, is the latest thing
 * they asked for, and the saved session does not get to close it. It joins the group the session
 * gives the focus, in front. The section each open resource was left on comes back with it.
 * A window without an origin holds nothing else: it starts empty, and
 * letting go of an origin empties it.
 */
export function loadSessionInto(
    mainBridge: CoreBridge,
    get: () => ShellData,
    set: (partial: Partial<ShellData>) => void,
): (originId: string) => Promise<Result<UiSession>> {
    return async (originId) => {
        const before = get().activeOriginId === null ? new Map() : tabsByName(get().grid);
        const result = await mainBridge.session.load();

        if (result.ok) {
            set({
                activeOriginId: originId,
                activeWorkspaceId: result.value.activeWorkspaceId,
                maximizedGroupId: null,
                panels: { ...result.value.panels },
                ...restored(result.value, get(), openedSince(before, get().grid)),
            });
        }

        return result;
    };
}

function openedSince(before: ReadonlyMap<string, Tab>, grid: GridNode): Tab[] {
    return [...tabsByName(grid).values()].filter((tab) => !before.has(tab.id));
}

function restored(session: UiSession, now: ShellData, meanwhile: readonly Tab[]): Restored {
    const grid = dropUnknownKinds(flattenedGrid(session.grid));
    const saved: Layout = {
        activeGroupId: focusedGroup(grid, session.activeGroupId),
        grid,
        resources: resourceIndexOf(grid),
    };
    const layout = meanwhile.reduce((at, tab) => tabOpened(at, at.activeGroupId, tab), saved);
    const kept = meanwhile.filter((tab) => tab.id in now.tabState);

    return {
        ...layout,
        // Only the resources the restored grid still opens: a dropped tab takes its section along.
        sections: openSections(session.sections ?? {}, layout.resources),
        tabState: {
            ...session.tabState,
            ...Object.fromEntries(kept.map((tab) => [tab.id, now.tabState[tab.id]])),
        },
    };
}

/** The group that had the keyboard, unless dropping a tab closed it and took it with it. */
function focusedGroup(grid: GridNode, saved: string): string {
    const groups = leavesOf(grid);

    return groups.some((leaf) => leaf.id === saved) ? saved : (groups[0]?.id ?? saved);
}
