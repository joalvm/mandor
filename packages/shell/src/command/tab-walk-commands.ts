import type { IconName } from '@mandor/ui';

import { selectActiveGroup, selectTabs } from '../selectors.js';
import { recencyOf, recentTabAt } from '../tab/tab-recency.js';
import type { Tab } from '../tab/tab.js';
import type { Command } from './command-registry.js';
import type { ShellStore } from '../shell-store.js';

const CATEGORY = 'commands:categoryTab';

type Step = -1 | 1;

function shownIndex(state: ShellStore): number {
    const group = selectActiveGroup(state);

    return group?.tabs.findIndex((tab) => tab.id === group.activeTab) ?? -1;
}

function hasOthers(state: ShellStore): boolean {
    return selectTabs(state).length > 1;
}

/** Going round the strip: past the last tab comes the first, before the first the last. */
function stepping(id: string, title: string, icon: IconName, step: Step): Command {
    return {
        category: CATEGORY,
        icon,
        id,
        run: (state) => {
            const tabs = selectTabs(state);
            const next = tabs.at((shownIndex(state) + step) % tabs.length);

            if (next !== undefined) {
                state.setActiveTab(state.activeGroupId, next.id);
            }
        },
        title,
        when: hasOthers,
    };
}

/**
 * Down the order of use, or back up it. The order stands still while the modifier is held, so
 * pressing again goes one further; letting go makes the tab reached the one used last.
 */
function walking(id: string, title: string, icon: IconName, step: Step): Command {
    return {
        category: CATEGORY,
        icon,
        id,
        run: (state) => {
            const fresh = state.recentWalk === null;
            const recency = fresh ? recencyOf(state.recentTabs, state.grid) : state.recentTabs;
            const reached = (state.recentWalk ?? 0) + step;
            const tabId = recentTabAt(recency[state.activeGroupId] ?? [], reached);

            if (tabId !== undefined) {
                state.walkRecent(reached, tabId);
            }
        },
        title,
        when: hasOthers,
    };
}

/** The tab beside the one in front, on the same side of the pinned as it. */
function neighbourOf(state: ShellStore, step: Step): Tab | undefined {
    const tabs = selectTabs(state);
    const index = shownIndex(state);
    const shown = tabs[index];
    const other = index < 0 ? undefined : tabs[index + step];

    return shown !== undefined && other !== undefined && shown.pinned === other.pinned
        ? other
        : undefined;
}

/** Moves the tab in front one place, never across the edge of the pinned. */
function moving(id: string, title: string, icon: IconName, step: Step): Command {
    return {
        category: CATEGORY,
        icon,
        id,
        run: (state) => {
            const ids = selectTabs(state).map((tab) => tab.id);
            const index = shownIndex(state);
            const other = neighbourOf(state, step);
            const shown = ids[index];

            if (other !== undefined && shown !== undefined) {
                ids[index] = other.id;
                ids[index + step] = shown;
                state.setTabOrder(state.activeGroupId, ids);
            }
        },
        title,
        when: (state) => neighbourOf(state, step) !== undefined,
    };
}

export const TAB_WALK_COMMANDS: readonly Command[] = [
    {
        category: CATEGORY,
        icon: 'refresh',
        id: 'tab.reopen',
        run: (state) => {
            state.reopenTab();
        },
        title: 'commands:reopenTab',
        when: (state) => state.closedTabs.length > 0,
    },
    {
        category: CATEGORY,
        icon: 'search',
        id: 'tab.search',
        run: (state) => {
            state.setListingGroup(state.activeGroupId);
        },
        title: 'commands:searchTabs',
    },
    stepping('tab.next', 'commands:nextTab', 'chevron-right', 1),
    stepping('tab.previous', 'commands:previousTab', 'chevron-left', -1),
    walking('tab.recent', 'commands:recentTab', 'chevron-down', 1),
    walking('tab.recentBack', 'commands:recentTabBack', 'chevron-up', -1),
    moving('tab.moveRight', 'commands:moveTabRight', 'arrow-outbound', 1),
    moving('tab.moveLeft', 'commands:moveTabLeft', 'arrow-inbound', -1),
];
