import { formatResourceUri } from '@mandor/schema';
import { shellStore } from '@mandor/shell';

/** One workspaces tab per window, so its id is its kind. */
export const WORKSPACES_TAB_KIND = 'workspaces';

/**
 * Opens the management tab, or goes to the one that is open, in whatever group of the window it
 * ended up in. Opening a tab that is open is showing it again, so there is never a second one,
 * and the group holding it takes the focus: asking from the other half must not answer nothing.
 */
export function openWorkspacesTab(): void {
    const state = shellStore.getState();
    // It belongs to the window and not to any origin, so the session of any origin can hold it.
    const resource = formatResourceUri({ scope: 'app', name: WORKSPACES_TAB_KIND });

    state.openTab(state.activeGroupId, {
        id: WORKSPACES_TAB_KIND,
        kind: WORKSPACES_TAB_KIND,
        resource,
    });
}
