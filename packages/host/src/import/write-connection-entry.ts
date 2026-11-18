import type { ImportPlanEntry } from '@mandor/interop-core';
import { connectionExtrasOf, type ItemOrigin } from '@mandor/schema';
import { createConnection, updateConnection } from '@mandor/store-fs';

/** The transports a connection can be written with; any other written is the websocket. */
const TRANSPORTS = ['socketio', 'websocket'] as const;

/**
 * Writes one connection of an import: created from what the document carries, or updated in
 * place when the plan found it already there. The headers, query, notes, auth and transport
 * settings come as the document had them; a part that is not valid is left out.
 */
export async function writeConnectionEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
    identity: ItemOrigin | null,
): Promise<void> {
    const origin = entry.resource?.origin ?? identity ?? undefined;
    const extras = connectionExtrasOf(entry.resource?.fields ?? {});
    const url = connectionUrl(entry);
    const written = { ...connectionValues(entry), ...extras, headers: extras.headers ?? [] };

    if (entry.class === 'update') {
        await updateConnection(root, workspaceId, entry.route, {
            ...written,
            ...(url === '' ? {} : { url }),
            ...(origin === undefined ? {} : { origin }),
        });

        return;
    }

    // The route is the id: a later import of the same document finds the connection by it.
    await createConnection(root, workspaceId, { ...written, id: entry.route, url, origin });
}

/** What the connection write manages: the name, and the transport it goes with. */
function connectionValues(entry: ImportPlanEntry): {
    name: string;
    transport: 'socketio' | 'websocket';
} {
    const fields = entry.resource?.fields ?? {};

    return {
        name: typeof fields['name'] === 'string' ? fields['name'] : entry.name,
        transport: TRANSPORTS.find((transport) => transport === fields['transport']) ?? 'websocket',
    };
}

function connectionUrl(entry: ImportPlanEntry): string {
    const url = entry.resource?.fields['url'];

    return typeof url === 'string' ? url : '';
}
