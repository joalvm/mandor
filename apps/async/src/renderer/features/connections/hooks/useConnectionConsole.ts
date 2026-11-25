import { useMessages } from '@mandor/i18n';
import { writeConsole } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import type { ConnectionsSlice } from '../connections.slice.js';
import { connectionsStore } from '../connections-store.js';
import { connectionConsoleWrites } from '../lib/connection-console-writes.js';

/**
 * Writes every connection of the window to its console as it moves: the dial, the socket coming
 * up or going down, each retry and each failure in the words of the transport, each entry saying
 * the name of its connection, as a browser keeps the sockets of its page.
 */
export function useConnectionConsole(): void {
    const connections = useMessages('connections');
    const errors = useMessages('errors');
    const writesOf = useEffectEvent((next: ConnectionsSlice, previous: ConnectionsSlice) =>
        connectionConsoleWrites(previous, next, { connections, errors }),
    );

    // The store lives as long as the window, so the subscription has a whole life cycle.
    useEffect(
        () =>
            connectionsStore.subscribe((next, previous) => {
                writeConsole(writesOf(next, previous));
            }),
        [],
    );
}
