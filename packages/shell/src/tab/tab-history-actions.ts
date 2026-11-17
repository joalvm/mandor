import { tabReopened, type Layout } from '../grid/grid-changes.js';
import type { UiSlice } from '../ui.slice.js';
import { recencyOf } from './tab-recency.js';

/** What the window does with the tabs it remembers: the ones that left and the order of use. */
export type TabHistoryActions = {
    /** Lets go of the modifier of a walk down the order of use: where it stopped is now used. */
    endRecentWalk: () => void;
    /**
     * Brings back a tab that left the window —the last one, unless one is named— to its group and
     * place if they remain.
     */
    reopenTab: (tabId?: string) => void;
    /** Puts in front the tab `step` places down the order of use, holding the order still. */
    walkRecent: (step: number, tabId: string) => void;
};

export function tabHistoryActionsFor(
    get: () => UiSlice,
    set: (partial: Partial<UiSlice>) => void,
    relaid: (change: (layout: Layout) => Layout) => void,
    show: (groupId: string, tabId: string) => void,
): TabHistoryActions {
    return {
        endRecentWalk: () => {
            const { grid, recentTabs, recentWalk } = get();

            if (recentWalk !== null) {
                set({ recentTabs: recencyOf(recentTabs, grid), recentWalk: null });
            }
        },
        reopenTab: (tabId) => {
            const { closedTabs } = get();
            const entry =
                tabId === undefined
                    ? closedTabs[0]
                    : closedTabs.find((each) => each.tab.id === tabId);

            if (entry !== undefined) {
                set({ closedTabs: closedTabs.filter((each) => each !== entry) });
                relaid((layout) => tabReopened(layout, entry));
            }
        },
        walkRecent: (step, tabId) => {
            const { activeGroupId, grid, recentTabs, recentWalk } = get();

            // The walk freezes the order as it stands when it starts.
            set({
                recentTabs: recentWalk === null ? recencyOf(recentTabs, grid) : recentTabs,
                recentWalk: step,
            });
            show(activeGroupId, tabId);
        },
    };
}
