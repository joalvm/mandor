import { leavesOf } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { fireAndForget, shellStore } from '@mandor/shell';

import { connectionIdOf } from './connection-resource.js';
import { toggleConnection } from './toggle-connection.js';

/**
 * Dials the connections the window came back showing that asked to be dialled.
 *
 * A restored tab remembers what was being looked at, not that a socket should be opened. A
 * workspace holding a dozen connections would otherwise talk to a dozen services before the
 * user has read the window, and some of them answer by doing work. So a connection comes back
 * closed unless its own file says `autoConnect`, and even then only while its tab is on screen.
 *
 * The grid and the connections of a workspace land in the window by different doors, and on a
 * slow day either may arrive first, so the match between the two runs on every move of the
 * window until nothing is left waiting: a connection whose tab shows up later is dialled then.
 * Each one is dialled once, and the returned cleanup lets go of whatever never matched.
 */
export function openRestoredConnections(connections: readonly Connection[]): () => void {
    const waiting = new Map(
        connections.filter((each) => each.autoConnect === true).map((each) => [each.id, each]),
    );

    const attempt = (): void => {
        const workspaceId = shellStore.getState().activeWorkspaceId;

        if (workspaceId === null) {
            return;
        }

        const shown = shownConnectionIds();

        for (const [id, connection] of waiting) {
            if (!shown.has(id)) {
                continue;
            }

            waiting.delete(id);
            fireAndForget(toggleConnection(connection, false, { workspaceId }));
        }

        if (waiting.size === 0) {
            unsubscribe();
        }
    };

    const unsubscribe = shellStore.subscribe(attempt);

    attempt();

    return unsubscribe;
}

/** Which connections the grid is showing, whichever group each of their tabs ended up in. */
function shownConnectionIds(): Set<string> {
    const tabs = leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs);
    const connections = tabs.filter((tab) => tab.kind === 'connection');

    return new Set(connections.map((tab) => connectionIdOf(tab.resource)));
}
