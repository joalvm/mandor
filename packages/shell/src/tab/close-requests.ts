import { leavesOf, type GridNode } from '@mandor/ipc';

import { leafOf } from '../grid/grid-leaf.js';
import { tabKind } from './tab-kind-registry.js';
import type { Tab } from './tab.js';
import { unsavedQuestion } from './unsaved-question.js';

/** What the window offers to close something while giving its kind the chance to say no. */
export type CloseRequests = {
    /** True when the group went; false when a tab in it asked to stay. */
    requestCloseGroup: (groupId: string) => Promise<boolean>;
    /** True when the tab went; false when it asked to stay. */
    requestCloseTab: (groupId: string, tabId: string) => Promise<boolean>;
    /** True when every tab went; false when one asked to stay, and the asking stopped there. */
    requestCloseTabs: (groupId: string, tabIds: readonly string[]) => Promise<boolean>;
};

/** The moves of the store a request ends in, read when the answer arrives and not before. */
export type CloseTarget = {
    closeGroup: (groupId: string) => void;
    closeTab: (groupId: string, tabId: string) => void;
    grid: GridNode;
    /** Puts the tab being asked about in front, so the question is about what is seen. */
    setActiveTab: (groupId: string, tabId: string) => void;
};

type Asked = { ask: () => Promise<boolean>; tab: Tab };

/** Whether a view that is not leaving goes on showing the thing of the tab, work and all. */
function shownElsewhere(grid: GridNode, tab: Tab, leaving: readonly Tab[]): boolean {
    return leavesOf(grid).some((leaf) =>
        leaf.tabs.some(
            (other) => other.resource === tab.resource && other !== tab && !leaving.includes(other),
        ),
    );
}

/**
 * The question a tab asks before it goes, or none. Unsaved work asks the window's own question
 * —save, let go, or stay—, unless another view that stays open still holds it; any other kind
 * may ask one of its own.
 */
function questionOf(
    grid: GridNode,
    tab: Tab,
    leaving: readonly Tab[],
): (() => Promise<boolean>) | undefined {
    const kind = tabKind(tab.kind);

    if (kind?.dirty?.(tab.id, tab.resource) === true && !shownElsewhere(grid, tab, leaving)) {
        return () => unsavedQuestion.getState().ask(tab);
    }

    const ask = kind?.beforeClose;

    return ask === undefined ? undefined : () => ask(tab.id);
}

function askedOf(grid: GridNode, tabs: readonly Tab[]): Asked[] {
    return tabs.flatMap((tab) => {
        const ask = questionOf(grid, tab, tabs);

        return ask === undefined ? [] : [{ ask, tab }];
    });
}

function tabsIn(target: () => CloseTarget, groupId: string): readonly Tab[] {
    return leafOf(target().grid, groupId)?.tabs ?? [];
}

/**
 * What has nothing to ask goes at once, in the same turn, as a close always did. The rest asks
 * one at a time, in the order of the strip, each in front while it asks, and goes the moment
 * its answer lets it. The first no stops the asking: what was answered stays closed, and what
 * was not asked yet stays open.
 */
async function closeEach(
    target: () => CloseTarget,
    groupId: string,
    tabs: readonly Tab[],
): Promise<boolean> {
    const asked = askedOf(target().grid, tabs);

    for (const tab of tabs) {
        if (!asked.some((each) => each.tab === tab)) {
            target().closeTab(groupId, tab.id);
        }
    }

    for (const { ask, tab } of asked) {
        target().setActiveTab(groupId, tab.id);

        if (!(await ask())) {
            return false;
        }

        target().closeTab(groupId, tab.id);
    }

    return true;
}

function closeTabs(
    target: () => CloseTarget,
    groupId: string,
    tabIds: readonly string[],
): Promise<boolean> {
    return closeEach(
        target,
        groupId,
        tabsIn(target, groupId).filter((tab) => tabIds.includes(tab.id)),
    );
}

export function closeRequestsFor(target: () => CloseTarget): CloseRequests {
    return {
        requestCloseGroup: async (groupId) => {
            const tabs = tabsIn(target, groupId);

            // A group with nothing to ask goes whole, without emptying it tab by tab first.
            if (
                askedOf(target().grid, tabs).length > 0 &&
                !(await closeEach(target, groupId, tabs))
            ) {
                return false;
            }

            if (leafOf(target().grid, groupId) !== undefined) {
                target().closeGroup(groupId);
            }

            return true;
        },
        requestCloseTab: (groupId, tabId) => closeTabs(target, groupId, [tabId]),
        requestCloseTabs: (groupId, tabIds) => closeTabs(target, groupId, tabIds),
    };
}
