import type { CollectionItem, ConnectionTransport } from '@mandor/schema';

export const OUTLINE_KINDS = [
    'collection',
    'connection',
    'doc',
    'environment',
    'folder',
    'message',
    'other',
    'request',
    'settings',
    'socketio',
] as const;

/** What a node of the outline is: the kinds a format can have no place for are the ones named. */
export type OutlineKind = (typeof OUTLINE_KINDS)[number];

export const OUTLINE_LOSSES = [
    'authInEachOperation',
    'authMovedDown',
    'connectionQueryOffDropped',
    'connectionsInFirstCollection',
    'disabledVariablesDropped',
    'examplesDropped',
    'folderVariablesUnresolved',
    'foldersFlattened',
    'headersCopied',
    'headersInEachOperation',
    'headersMovedDown',
    'messageDetailsDropped',
    'messagesInConnectionOfName',
    'messagesNeedConnection',
    'messagesNotHttp',
    'noConnections',
    'noSocketio',
    'noVariables',
    'noWebsocketMessages',
    'noWorkspaceNotes',
    'schemasDropped',
    'scriptsNotCarried',
    'settingsDropped',
    'socketioOwnKind',
    'tagsDropped',
] as const;

/** What a format can say it loses: a code, because the words belong to the window that shows it. */
export type OutlineLoss = (typeof OUTLINE_LOSSES)[number];

/** Why a kind of node does not leave in a format; a kind that is not listed is written. */
export type UnwrittenKinds = Readonly<Partial<Record<OutlineKind, OutlineLoss>>>;

/**
 * A connection is told by its transport: a format may write the WebSocket ones and have no place
 * for Socket.IO, which has an event protocol of its own.
 */
const CONNECTION_KINDS: Record<ConnectionTransport, OutlineKind> = {
    socketio: 'socketio',
    websocket: 'connection',
};

/** The kind a format answers for when it names none for the one asked: Socket.IO is a connection. */
const FALLBACK_KINDS: Partial<Record<OutlineKind, OutlineKind>> = { socketio: 'connection' };

/** The kinds of item the outline tells apart; anything else is `other`. */
const ITEM_KINDS = new Map<string, OutlineKind>([
    ['message', 'message'],
    ['request', 'request'],
]);

/** The kind a connection of this transport is outlined as. */
export function connectionKindOf(transport: ConnectionTransport): OutlineKind {
    return CONNECTION_KINDS[transport];
}

/** The kind an item is outlined as. */
export function itemKindOf(item: CollectionItem): OutlineKind {
    return ITEM_KINDS.get(item.kind) ?? 'other';
}

/** Why the format leaves this kind out, or undefined when it writes it. */
export function unwrittenReasonOf(
    kind: OutlineKind,
    unwritten: UnwrittenKinds,
): OutlineLoss | undefined {
    const fallback = FALLBACK_KINDS[kind];

    return unwritten[kind] ?? (fallback === undefined ? undefined : unwritten[fallback]);
}
