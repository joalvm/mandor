import type { ActivityRecord, ErrorCode, WsScriptNote } from '@mandor/ipc';

/** A recorded frame plus the environment main used when it opened the socket. */
export type ConnectionMessage = ActivityRecord & { environmentId: string | null };

/** A network failure with the moment it happened: the activity log needs both. */
export type ConnectionFault = {
    at: number;
    code: ErrorCode;
    /** What the transport said, as it said it: `getaddrinfo ENOTFOUND api`. */
    message?: string | undefined;
};

/** The socket of a connection coming up or going down: the lines that frame what it moved. */
export type ConnectionStatus = 'connected' | 'disconnected';

type Timed = {
    /** Epoch milliseconds, for the timeline. */
    at: number;
    /** What the entry weighs against the buffer cap: bytes on the wire, not string length. */
    bytes: number;
    id: string;
};

export type ConnectionMessageEntry = Timed & {
    detail: ConnectionMessage;
    kind: 'connection-message';
};

export type ConnectionFaultEntry = Timed & {
    detail: ConnectionFault;
    kind: 'connection-fault';
};

export type ConnectionStatusEntry = Timed & {
    detail: { status: ConnectionStatus };
    kind: 'connection-status';
};

/** What the scripts of the connection said at one moment: the console has the lines. */
export type ConnectionScriptEntry = Timed & {
    detail: WsScriptNote;
    kind: 'connection-script';
};

/**
 * One thing that happened on a resource, as the timeline holds it. The kind says what `detail`
 * carries, so the row, the dock and the search each read it from a table with one answer per
 * kind: a new kind that nobody draws does not build. Whatever depends on the connection that
 * produced the entry travels inside it.
 */
export type ActivityEntry =
    ConnectionMessageEntry | ConnectionFaultEntry | ConnectionStatusEntry | ConnectionScriptEntry;

/** The entry of one kind, with the `detail` that kind carries. */
type ActivityEntryOf<K extends ActivityEntry['kind']> = Extract<ActivityEntry, { kind: K }>;

/** One answer for each kind of entry, each reading the entry of its own kind. */
export type ByEntryKind<R> = {
    [K in ActivityEntry['kind']]: (entry: ActivityEntryOf<K>) => R;
};

function pickIn<R, K extends ActivityEntry['kind']>(
    table: ByEntryKind<R>,
    kind: K,
    entry: ActivityEntryOf<K>,
): R {
    return table[kind](entry);
}

/** What the table answers for an entry, read by the entry's own kind. */
export function pickByKind<R>(table: ByEntryKind<R>, entry: ActivityEntry): R {
    return pickIn(table, entry.kind, entry);
}

/**
 * An entry before the buffer takes it in: the name is the buffer's to give. Left out of each
 * kind apart, because leaving it out of the union at once would forget which `detail` goes with
 * which kind.
 */
export type NewActivityEntry =
    | Omit<ConnectionMessageEntry, 'id'>
    | Omit<ConnectionFaultEntry, 'id'>
    | Omit<ConnectionStatusEntry, 'id'>
    | Omit<ConnectionScriptEntry, 'id'>;
