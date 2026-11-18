import { originName, shellStore } from '@mandor/shell';

import { diffResource } from './history-resource.js';

/** The kind of the tab that compares two sends. */
export const DIFF_TAB_KIND = 'history-diff';

/**
 * Opens the tab that compares two sends. The ids are put in one order whichever was picked
 * first, so the same two sends are the same tab and picking them again focuses it.
 */
export function openComparison(workspaceId: string, picked: readonly [string, string]): void {
    const [a, b] = [...picked].sort();
    const state = shellStore.getState();

    if (a === undefined || b === undefined) {
        return;
    }

    state.openTab(state.activeGroupId, {
        id: `${DIFF_TAB_KIND}-${a}-${b}`,
        kind: DIFF_TAB_KIND,
        resource: diffResource(originName(), workspaceId, a, b),
    });
}
