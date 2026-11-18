import { matchSorter, rankings } from 'match-sorter';

import type { ClosedTab } from './closed-tabs.js';
import type { Tab } from './tab.js';

/** A line of the list of tabs: the tab, the name it is found by and whether it left the window. */
export type ListedTab = { closed: boolean; tab: Tab; title: string };

function ranked(lines: readonly ListedTab[], query: string): ListedTab[] {
    if (query.trim().length === 0) {
        return [...lines];
    }

    return matchSorter(lines, query, {
        baseSort: (one, other) => one.index - other.index,
        keys: ['title'],
        threshold: rankings.ACRONYM,
    });
}

/**
 * What the list of a group offers for what was typed: its open tabs, the pinned on top, then what
 * left the window lately and is not open again. Both are matched the way the palette matches a
 * command, word initials included, and keep their own order when nothing was typed.
 */
export function listedTabs(
    open: readonly Tab[],
    closed: readonly ClosedTab[],
    query: string,
    titleOf: (tab: Tab) => string,
): ListedTab[] {
    const here = new Set(open.map((tab) => tab.id));
    const opened = ranked(
        open.map((tab) => ({ closed: false, tab, title: titleOf(tab) })),
        query,
    ).sort((one, other) => Number(other.tab.pinned === true) - Number(one.tab.pinned === true));
    const gone = closed
        .filter((each) => !here.has(each.tab.id))
        .map((each) => ({ closed: true, tab: each.tab, title: titleOf(each.tab) }));

    return [...opened, ...ranked(gone, query)];
}
