import { leavesOf, type GridAxis, type GridNode } from '@mandor/ipc';

import { groupClosed, groupSplit, laidOut, tabOpened, type Layout } from './grid-changes.js';
import { groupBeside } from './group-beside.js';
import { leafOf } from './grid-leaf.js';
import { nextGroupId } from './group-id.js';
import type { Tab } from '../tab/tab.js';
import type { UiSlice } from '../ui.slice.js';

/** What can be done to the groups of a window, as opposed to the tabs that live inside them. */
export type GroupActions = {
    closeGroup: (groupId: string) => void;
    focusGroup: (groupId: string) => void;
    focusGroupAt: (index: number) => void;
    openTabAside: (tab: Tab) => void;
    rearrangeGrid: (grid: GridNode, focused: string) => void;
    splitGroup: (groupId: string, axis: GridAxis) => string;
    toggleMaximized: () => void;
};

export function groupActionsFor(
    get: () => UiSlice,
    set: (partial: Partial<UiSlice>) => void,
    relaid: (change: (layout: Layout) => Layout) => void,
): GroupActions {
    return {
        closeGroup: (groupId) => {
            relaid((layout) => groupClosed(layout, groupId));
        },
        focusGroup: (groupId) => {
            relaid((layout) =>
                leafOf(layout.grid, groupId) === undefined
                    ? layout
                    : laidOut(layout, layout.grid, groupId),
            );
        },
        /** Which group of the window, counted the way they are drawn, takes the focus. */
        focusGroupAt: (index) => {
            const group = leavesOf(get().grid)[index];

            if (group !== undefined) {
                relaid((layout) => laidOut(layout, layout.grid, group.id));
            }
        },
        /** Puts the tab where the focused group is not, splitting the window if there is nowhere. */
        openTabAside: (tab) => {
            const state = get();
            const beside = groupBeside(state.grid, state.activeGroupId);
            const target = beside ?? nextGroupId(state.grid);

            relaid((layout) =>
                tabOpened(
                    beside === null
                        ? groupSplit(layout, layout.activeGroupId, 'row', target)
                        : layout,
                    target,
                    tab,
                ),
            );
        },
        /**
         * Takes the arrangement a drag left behind, with the focus on the group that received it.
         *
         * A drag is the one move that is made in the view, so the view answers with the whole
         * tree instead of with a move. It is read the way any other change is read: the tabs are
         * the ones the window already had, the index is rebuilt from them, and the session is
         * saved, so a window that is drawn again after it is the one that was let go of.
         */
        rearrangeGrid: (grid, focused) => {
            relaid((layout) => laidOut(layout, grid, focused));
        },
        /** Answers with the id of the group it made, so the caller can open something in it. */
        splitGroup: (groupId, axis) => {
            const id = nextGroupId(get().grid);

            relaid((layout) => groupSplit(layout, groupId, axis, id));

            return id;
        },
        /** Shows the focused group on its own, or gives the window back the way it was. */
        toggleMaximized: () => {
            const state = get();

            set({ maximizedGroupId: state.maximizedGroupId === null ? state.activeGroupId : null });
        },
    };
}
