import type { Connection } from '@mandor/schema';
import { originName, selectGroupOfTab, shellStore } from '@mandor/shell';

import { connectionsStore } from '../connections-store.js';

import { connectionResource } from './connection-resource.js';
import type { WorkspaceScope } from './workspace-scope.js';

/** Where a connection asked for goes: its own group when one said so, the active one when not. */
export type OpenTarget = {
    aside?: boolean;
    groupId?: string;
};

/**
 * Shows a connection in the centre. One connection is one resource, so a second tab of it would
 * be the same view twice: the tab that already holds it is focused instead, wherever it sits.
 * Asking for it aside only means anything when there is no tab yet.
 *
 * A connection never opens as a look the next click replaces, unlike a request of Sync: its tab is
 * the persisted connection with a live socket and a timeline, not a view of a file.
 */
export function openConnection(
    connection: Connection,
    scope: WorkspaceScope,
    target: OpenTarget = {},
): void {
    const shell = shellStore.getState();
    const opened = selectGroupOfTab(shell, connection.id);

    connectionsStore.getState().setActiveConnection(connection.id);

    if (opened !== null) {
        shell.setActiveTab(opened, connection.id);
        shell.focusGroup(opened);

        return;
    }

    const tab = {
        id: connection.id,
        kind: 'connection',
        resource: connectionResource(originName(), scope.workspaceId, connection.id),
    };

    if (target.aside === true) {
        shell.openTabAside(tab);

        return;
    }

    shell.openTab(target.groupId ?? shell.activeGroupId, tab);
}
