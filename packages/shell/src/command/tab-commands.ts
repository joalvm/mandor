import { leavesOf, type GridNode } from '@mandor/ipc';

import { fireAndForget } from '../fire-and-forget.js';
import { groupBeside } from '../grid/group-beside.js';
import { keptTab } from '../grid/leaf-preview.js';
import { tabKind } from '../tab/tab-kind-registry.js';
import type { Command } from './command-registry.js';
import type { ShellStore } from '../shell-store.js';
import type { Tab } from '../tab/tab.js';
import {
    closableTabs,
    holdsDirty,
    isClosable,
    othersOf,
    rightOf,
    savedOf,
    shownTab,
} from './tab-targets.js';

const CATEGORY = 'commands:categoryTab';
const SECOND_VIEW = 2;

function hasShown(state: ShellStore): boolean {
    return shownTab(state) !== undefined;
}

function shownIsClosable(state: ShellStore): boolean {
    const tab = shownTab(state);

    return tab !== undefined && isClosable(state, tab);
}

function shownIsPreview(state: ShellStore): boolean {
    return shownTab(state)?.preview === true;
}

function shownIsPinned(state: ShellStore): boolean {
    return shownTab(state)?.pinned === true;
}

function hasNeighbour(state: ShellStore): boolean {
    return groupBeside(state.grid, state.activeGroupId) !== null;
}

/** The section of the lateral that lists the tab in front, if one does. */
function shownSection(state: ShellStore): string | undefined {
    const tab = shownTab(state);

    return tab === undefined ? undefined : tabKind(tab.kind)?.section;
}

/** A command on the tab in front: with no tab there, it does nothing. */
function onShown(
    command: Omit<Command, 'category' | 'run'>,
    act: (state: ShellStore, tab: Tab) => void,
): Command {
    return {
        ...command,
        category: CATEGORY,
        run: (state) => {
            const tab = shownTab(state);

            if (tab !== undefined) {
                act(state, tab);
            }
        },
    };
}

/** Every one of them goes through the questions of its kind, in order, and all go or none. */
function closeEach(state: ShellStore, tabs: readonly Tab[]): void {
    fireAndForget(
        state.requestCloseTabs(
            state.activeGroupId,
            tabs.map((tab) => tab.id),
        ),
    );
}

/** One of the commands that close a part of the group: what it closes is the whole difference. */
function closing(
    id: string,
    title: string,
    tabsOf: (state: ShellStore) => readonly Tab[],
): Command {
    return {
        category: CATEGORY,
        icon: 'close',
        id,
        run: (state) => {
            closeEach(state, tabsOf(state));
        },
        title,
        when: (state) => tabsOf(state).length > 0,
    };
}

/**
 * The id of one more view of what a tab is already looking at.
 *
 * Tab ids are unique across the window and are written to the session, so a second view takes
 * the lowest free number the way a new group does, instead of a fresh random name that would
 * grow the session file every time somebody opens something beside.
 */
function nextViewId(grid: GridNode, tabId: string): string {
    const taken = new Set(leavesOf(grid).flatMap((leaf) => leaf.tabs.map((tab) => tab.id)));
    let index = SECOND_VIEW;

    while (taken.has(`${tabId}#${String(index)}`)) {
        index += 1;
    }

    return `${tabId}#${String(index)}`;
}

export const TAB_COMMANDS: readonly Command[] = [
    // Closing the one tab asked for closes it pinned or not: only a closing of many spares it.
    onShown(
        { icon: 'close', id: 'tab.close', title: 'commands:closeTab', when: shownIsClosable },
        (state, tab) => {
            fireAndForget(state.requestCloseTab(state.activeGroupId, tab.id));
        },
    ),
    closing('tab.closeOthers', 'commands:closeOtherTabs', othersOf),
    closing('tab.closeRight', 'commands:closeTabsToTheRight', rightOf),
    {
        ...closing('tab.closeSaved', 'commands:closeSavedTabs', savedOf),
        // With nothing unsaved in the group, the saved are all of them: that is the next command.
        when: (state) => holdsDirty(state) && savedOf(state).length > 0,
    },
    closing('tab.closeAll', 'commands:closeAllTabs', closableTabs),
    onShown(
        { icon: 'check', id: 'tab.keepOpen', title: 'commands:keepTabOpen', when: shownIsPreview },
        (state, tab) => {
            state.keepTab(tab.id);
        },
    ),
    onShown(
        {
            icon: 'pin',
            id: 'tab.pin',
            title: 'commands:pinTab',
            when: (state) => hasShown(state) && !shownIsPinned(state),
        },
        (state, tab) => {
            state.pinTab(tab.id);
        },
    ),
    onShown(
        { icon: 'pinned', id: 'tab.unpin', title: 'commands:unpinTab', when: shownIsPinned },
        (state, tab) => {
            state.unpinTab(tab.id);
        },
    ),
    onShown(
        {
            icon: 'arrow-outbound',
            id: 'tab.moveAside',
            title: 'commands:moveTabAside',
            when: (state) => hasShown(state) && hasNeighbour(state),
        },
        (state, tab) => {
            const beside = groupBeside(state.grid, state.activeGroupId);

            if (beside !== null) {
                state.moveTab(tab.id, beside);
            }
        },
    ),
    onShown(
        { icon: 'duplicate', id: 'tab.openAside', title: 'commands:openTabAside', when: hasShown },
        (state, tab) => {
            // The view beside is asked for, so it is kept: only a look is provisional.
            state.openTabAside({ ...keptTab(tab), id: nextViewId(state.grid, tab.id) });
        },
    ),
    onShown(
        {
            icon: 'sidebar-left',
            id: 'tab.reveal',
            title: 'commands:revealTab',
            when: (state) => shownSection(state) !== undefined,
        },
        (state, tab) => {
            const section = tabKind(tab.kind)?.section;
            const collapsed = state.panels.collapsedSections;

            state.setPanels({ collapsedSections: collapsed.filter((id) => id !== section) });
            state.setRevealing(tab.resource);
        },
    ),
];
