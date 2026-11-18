import { type Connection, parseConnection } from '@mandor/schema';

import { readOrThrow } from '../disk/read-or-throw.js';
import { connectionFile } from './connection-path.js';

/** Reads one connection. A file that cannot be loaded is a refusal, not an empty one. */
export async function readConnection(
    root: string,
    workspaceId: string,
    connectionId: string,
): Promise<Connection> {
    const read = await readOrThrow(
        connectionFile(root, workspaceId, connectionId),
        parseConnection,
    );

    return read.value;
}
