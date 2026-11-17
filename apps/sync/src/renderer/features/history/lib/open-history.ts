import { originName, type ShellStore } from '@mandor/shell';

import { historyResource } from './history-resource.js';

/** Both the kind of the tab and the name the rest of the window asks the surface by. */
export const HISTORY_TAB_KIND = 'history';

/** Shows the history of the open workspace, or goes to the tab that already does. */
export function openHistory(state: ShellStore): void {
    const { activeWorkspaceId } = state;

    if (activeWorkspaceId === null) {
        return;
    }

    state.openTab(state.activeGroupId, {
        id: `${HISTORY_TAB_KIND}-${activeWorkspaceId}`,
        kind: HISTORY_TAB_KIND,
        resource: historyResource(originName(), activeWorkspaceId),
    });
}
