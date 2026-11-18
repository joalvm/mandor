import { mapLeaf } from '../grid/grid-leaf.js';
import { withActiveTab } from '../grid/leaf-tabs.js';
import { selectActiveGroup } from '../selectors.js';
import { tabKind } from '../tab/tab-kind-registry.js';
import type { ShellStore } from '../shell-store.js';
import type { Tab } from '../tab/tab.js';

/** The tab the focused group shows: the one every tab command acts on. */
export function shownTab(state: ShellStore): Tab | undefined {
    const group = selectActiveGroup(state);

    return group?.tabs.find((tab) => tab.id === group.activeTab);
}

/**
 * A tab of a resource that is gone closes whatever its kind promised: there is nothing left on
 * disk for it to stay open for. The same rule the pill draws its close button by.
 */
export function isClosable(state: ShellStore, tab: Tab): boolean {
    return tabKind(tab.kind)?.closable === true || state.resources[tab.resource]?.missing === true;
}

/** Closing many never takes a pinned tab: pinning it was asking for it to stay. */
function closesInBulk(state: ShellStore, tab: Tab): boolean {
    return isClosable(state, tab) && tab.pinned !== true;
}

/** Whether the tab holds work its kind has not put on disk yet. */
function isDirty(tab: Tab): boolean {
    return tabKind(tab.kind)?.dirty?.(tab.id, tab.resource) === true;
}

function tabsOfGroup(state: ShellStore): readonly Tab[] {
    return selectActiveGroup(state)?.tabs ?? [];
}

/** What a closing of many may take in the focused group, in the order the strip draws it. */
export function closableTabs(state: ShellStore): readonly Tab[] {
    return tabsOfGroup(state).filter((tab) => closesInBulk(state, tab));
}

/** Everything the group holds except what is being read. */
export function othersOf(state: ShellStore): readonly Tab[] {
    const shown = shownTab(state);

    return closableTabs(state).filter((tab) => tab !== shown);
}

/** What stands after the tab being read, never before it. */
export function rightOf(state: ShellStore): readonly Tab[] {
    const tabs = tabsOfGroup(state);
    const shown = shownTab(state);
    const after = shown === undefined ? tabs.length : tabs.indexOf(shown) + 1;

    return tabs.slice(after).filter((tab) => closesInBulk(state, tab));
}

/** What has nothing left to put on disk, so closing it loses nothing. */
export function savedOf(state: ShellStore): readonly Tab[] {
    return closableTabs(state).filter((tab) => !isDirty(tab));
}

/** Whether the group holds work that is not on disk: only then are the saved set apart. */
export function holdsDirty(state: ShellStore): boolean {
    return tabsOfGroup(state).some(isDirty);
}

/** Whether a kind in the group waits to be saved at all: only then does closing the saved mean anything. */
export function canHoldDirty(state: ShellStore): boolean {
    return tabsOfGroup(state).some((tab) => tabKind(tab.kind)?.dirty !== undefined);
}

/**
 * The window as it would stand with this tab in front of its group and that group focused. A
 * command that acts on the tab in front is asked about another tab by asking it here.
 */
export function atTab(state: ShellStore, groupId: string, tabId: string): ShellStore {
    return {
        ...state,
        activeGroupId: groupId,
        grid: mapLeaf(state.grid, groupId, (leaf) => withActiveTab(leaf, tabId)),
    };
}
