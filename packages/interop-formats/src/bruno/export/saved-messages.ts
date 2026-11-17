import type { FormatDocument, WorkspaceData, WorkspaceFolderNode } from '@mandor/interop-core';
import { parseMessageItem, type CollectionItem } from '@mandor/schema';

/** The messages each WebSocket connection keeps saved, by the id of the connection. */
export type SavedMessages = ReadonlyMap<string, readonly FormatDocument[]>;

function messagesIn(level: WorkspaceFolderNode): CollectionItem[] {
    return [
        ...level.items.filter((item) => item.kind === 'message'),
        ...level.folders.flatMap(messagesIn),
    ];
}

/** A name a request of Bruno gave its message on the way in: alone, numbered or with a title. */
function comesFrom(name: string, socket: string): boolean {
    return (
        name === socket ||
        name.startsWith(`${socket}: `) ||
        (name.startsWith(`${socket} `) && /^\d+$/u.test(name.slice(socket.length + 1)))
    );
}

/** What is left of the name once the connection says the rest: nothing, or the title. */
function titleOf(name: string, socket: string): string {
    if (name.startsWith(`${socket}: `)) {
        return name.slice(socket.length + 2);
    }

    return comesFrom(name, socket) ? '' : name;
}

/**
 * Bruno keeps messages inside a WebSocket request, and in Mandor they hang from a collection with
 * no destination. Each goes to the connection it is named after, which is where it came from, or
 * else to the first one.
 */
export function savedMessagesOf(
    data: Pick<WorkspaceData, 'collections' | 'connections'>,
): SavedMessages {
    const sockets = data.connections.filter(({ transport }) => transport === 'websocket');
    const saved = new Map<string, FormatDocument[]>(sockets.map(({ id }) => [id, []]));
    const [first] = sockets;

    if (first === undefined) {
        return saved;
    }

    for (const item of data.collections.flatMap(messagesIn)) {
        const owner = sockets.find(({ name }) => comesFrom(item.name, name)) ?? first;
        const message = parseMessageItem(item);

        saved.get(owner.id)?.push({
            title: titleOf(item.name, owner.name),
            message: { type: message.payloadType, data: message.payload },
        });
    }

    return saved;
}
