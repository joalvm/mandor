import type { useMessages } from '@mandor/i18n';
import type { WsState } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import type { ConsoleWrite } from '@mandor/shell';
import type { ConsoleLevel } from '@mandor/ui';

import type { ConnectionStatus } from '../../../activity/activity-entry.js';

import type { ConnectionsSlice } from '../connections.slice.js';
import { connectionStatusOf } from './connection-status-entry.js';

type Labels = {
    connections: ReturnType<typeof useMessages<'connections'>>;
    errors: ReturnType<typeof useMessages<'errors'>>;
};

type ConsoleSlice = Pick<ConnectionsSlice, 'attempts' | 'connections' | 'faults' | 'states'>;

/** How the socket coming up or going down reads: up is news, down is the quiet end of it. */
const STATUS_LINES: Record<
    ConnectionStatus,
    { label: 'stateConnected' | 'stateDisconnected'; level: ConsoleLevel }
> = {
    connected: { label: 'stateConnected', level: 'info' },
    disconnected: { label: 'stateDisconnected', level: 'log' },
};

/** The states a dial is already under way in: a step between them is no new try. */
const DIALING: ReadonlySet<WsState> = new Set<WsState>(['connecting', 'reconnecting']);

function written(connection: Connection, level: ConsoleLevel, text: string): ConsoleWrite {
    return { level, text, source: connection.name };
}

function stateLines(
    connection: Connection,
    previous: WsState,
    next: WsState,
    labels: Labels,
): ConsoleWrite[] {
    const said = (word: string) => `${word} · ${connection.url}`;

    if (next === 'connecting' && !DIALING.has(previous)) {
        return [written(connection, 'log', said(labels.connections('stateConnecting')))];
    }

    const status = connectionStatusOf(previous, next);

    if (status === undefined) {
        return [];
    }

    const { label, level } = STATUS_LINES[status];

    return [written(connection, level, said(labels.connections(label)))];
}

function retryLines(
    connection: Connection,
    previous: ConsoleSlice,
    next: ConsoleSlice,
    labels: Labels,
): ConsoleWrite[] {
    const attempt = next.attempts[connection.id];

    if (attempt === undefined || attempt === previous.attempts[connection.id]) {
        return [];
    }

    const text = labels.connections('consoleReconnecting', { attempt: String(attempt) });

    return [written(connection, 'warn', text)];
}

function faultLines(
    connection: Connection,
    previous: ConsoleSlice,
    next: ConsoleSlice,
    labels: Labels,
): ConsoleWrite[] {
    const fault = next.faults[connection.id];

    if (fault === undefined || fault === previous.faults[connection.id]) {
        return [];
    }

    const message = fault.message ?? '';
    const text = `${connection.url} · ${labels.errors(fault.code)}`;

    return [
        { ...written(connection, 'error', text), detail: message === '' ? undefined : message },
    ];
}

/**
 * What the console writes of the connections between two moments of their store, as a browser
 * writes the sockets of its page: a dial, the socket coming up or going down, each retry and
 * each failure with the words of the transport, each one under the name of its connection. A
 * connection that did not move writes nothing.
 */
export function connectionConsoleWrites(
    previous: ConsoleSlice,
    next: ConsoleSlice,
    labels: Labels,
): ConsoleWrite[] {
    return next.connections.flatMap((connection) => {
        const before = previous.states[connection.id] ?? 'idle';
        const now = next.states[connection.id] ?? 'idle';
        const moved = before === now ? [] : stateLines(connection, before, now, labels);

        return [
            ...moved,
            ...retryLines(connection, previous, next, labels),
            ...faultLines(connection, previous, next, labels),
        ];
    });
}
