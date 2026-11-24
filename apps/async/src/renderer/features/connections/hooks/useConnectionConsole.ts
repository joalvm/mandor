import { useMessages } from '@mandor/i18n';
import { writeConsole } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import type { ConnectionsSlice } from '../connections.slice.js';
import { connectionsStore } from '../connections-store.js';
import { connectionConsoleWrites } from '../lib/connection-console.js';

/**
 * Writes every connection of the window to its console as it moves: the dial, the socket coming
 * up or going down, each retry and each failure in the words of the transport. Each dial from rest
 * is a run of its own under the name of the connection, as a browser keeps one line per socket.
 * Mounted once by the window.
 */
export function useConnectionConsole(): void {
    const connections = useMessages('connections');
    const errors = useMessages('errors');
    const writesOf = useEffectEvent((next: ConnectionsSlice, previous: ConnectionsSlice) =>
        connectionConsoleWrites(previous, next, { connections, errors }),
    );

    // The store lives as long as the window, so the subscription has a whole life cycle.
    useEffect(() => {
        const runs = new Map<string, string>();
        let written = 0;

        return connectionsStore.subscribe((next, previous) => {
            for (const { connection, starts, line } of writesOf(next, previous)) {
                written += 1;

                if (starts || !runs.has(connection.id)) {
                    runs.set(connection.id, `${connection.id}/${String(written)}`);
                }

                const id = runs.get(connection.id) ?? connection.id;

                writeConsole({ id, title: connection.name }, [{ key: String(written), ...line }]);
            }
        });
    }, []);
}
